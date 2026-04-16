/**
 * Globeify Cloud Functions (2nd gen).
 *
 * Exports:
 *  - geocode: callable that proxies OpenStreetMap Nominatim for place search.
 *    - Validates input (string, 1..120 chars, limit 1..8).
 *    - Requires auth.
 *    - Caches results in-memory for ~24h (max 500 entries).
 *    - Rate limits: 20 requests / 60s rolling window per UID.
 *    - Honours Nominatim's 1 req/sec rule by serialising outbound calls.
 */

import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

interface GeocodeRequest {
  query: string;
  limit?: number;
}

interface GeocodeResultOut {
  name: string;
  lat: number;
  lng: number;
  type?: string;
  displayName: string;
  country?: string;
}

interface CacheEntry {
  expires: number;
  results: GeocodeResultOut[];
}

// ----- Configuration ---------------------------------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CACHE_MAX_ENTRIES = 500;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;
const NOMINATIM_SPACING_MS = 1100; // >1s per policy
const FETCH_TIMEOUT_MS = 8000;
const MAX_QUERY_LEN = 120;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 8;

const USER_AGENT =
  "Globeify/1.0 (+https://globeify-a5c27.web.app; admin@globeify.app)";
const NOMINATIM_EMAIL = "admin@globeify.app";

// ----- Process-lifetime state -----------------------------------------------

const cache = new Map<string, CacheEntry>();
const rateLimits = new Map<string, number[]>(); // uid -> timestamps (ms)

// Serialise outbound calls through a promise chain with fixed spacing.
let nominatimChain: Promise<void> = Promise.resolve();
let lastNominatimStart = 0;

function enqueueNominatim<T>(fn: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const now = Date.now();
    const wait = Math.max(0, lastNominatimStart + NOMINATIM_SPACING_MS - now);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastNominatimStart = Date.now();
    return fn();
  };
  // Chain so subsequent calls wait for the previous to finish, then enforce spacing.
  const next = nominatimChain.then(run, run);
  // Keep chain alive even if a call errors — swallow rejection for the chain only.
  nominatimChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

// ----- Helpers ---------------------------------------------------------------

function normaliseQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

function pruneCache(): void {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (v.expires <= now) cache.delete(k);
  }
  if (cache.size > CACHE_MAX_ENTRIES) {
    // Evict oldest (Map preserves insertion order).
    const excess = cache.size - CACHE_MAX_ENTRIES;
    let i = 0;
    for (const k of cache.keys()) {
      if (i >= excess) break;
      cache.delete(k);
      i++;
    }
  }
}

function checkRateLimit(uid: string): void {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const arr = rateLimits.get(uid) ?? [];
  const recent = arr.filter((t) => t > windowStart);
  if (recent.length >= RATE_LIMIT_MAX) {
    throw new HttpsError(
      "resource-exhausted",
      "Too many geocode requests. Try again shortly."
    );
  }
  recent.push(now);
  rateLimits.set(uid, recent);
  // Opportunistic prune to prevent unbounded growth.
  if (rateLimits.size > 2000) {
    for (const [k, v] of rateLimits) {
      const kept = v.filter((t) => t > windowStart);
      if (kept.length === 0) rateLimits.delete(k);
      else rateLimits.set(k, kept);
    }
  }
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
}

interface NominatimItem {
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  name?: string;
  address?: NominatimAddress;
}

function mapItem(item: NominatimItem): GeocodeResultOut | null {
  const lat = item.lat ? parseFloat(item.lat) : NaN;
  const lng = item.lon ? parseFloat(item.lon) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const displayName = item.display_name ?? "";
  const addr = item.address ?? {};
  const fallback =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.state ||
    item.name ||
    (displayName ? displayName.split(",")[0].trim() : "");
  return {
    name: fallback || displayName,
    lat,
    lng,
    type: item.type,
    displayName,
    country: addr.country,
  };
}

async function fetchNominatim(
  q: string,
  limit: number
): Promise<GeocodeResultOut[]> {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?format=json&q=${encodeURIComponent(q)}&limit=${limit}` +
    `&addressdetails=1&email=${encodeURIComponent(NOMINATIM_EMAIL)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new HttpsError(
        "unavailable",
        `Geocoding upstream returned ${res.status}.`
      );
    }
    const json = (await res.json()) as NominatimItem[];
    if (!Array.isArray(json)) return [];
    const out: GeocodeResultOut[] = [];
    for (const item of json) {
      const mapped = mapItem(item);
      if (mapped) out.push(mapped);
    }
    return out;
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    if ((err as { name?: string })?.name === "AbortError") {
      throw new HttpsError(
        "deadline-exceeded",
        "Geocoding upstream timed out."
      );
    }
    throw new HttpsError("unavailable", "Geocoding upstream failed.");
  } finally {
    clearTimeout(timer);
  }
}

// ----- Callable --------------------------------------------------------------

export const geocode = onCall<GeocodeRequest>(
  { region: "us-central1" },
  async (request: CallableRequest<GeocodeRequest>) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Sign in to search places."
      );
    }
    const uid = request.auth.uid;

    const raw = request.data?.query;
    if (typeof raw !== "string") {
      throw new HttpsError("invalid-argument", "query must be a string.");
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new HttpsError("invalid-argument", "query must not be empty.");
    }
    if (trimmed.length > MAX_QUERY_LEN) {
      throw new HttpsError(
        "invalid-argument",
        `query must be at most ${MAX_QUERY_LEN} characters.`
      );
    }

    const rawLimit = request.data?.limit;
    let limit = DEFAULT_LIMIT;
    if (rawLimit !== undefined) {
      if (typeof rawLimit !== "number" || !Number.isFinite(rawLimit)) {
        throw new HttpsError("invalid-argument", "limit must be a number.");
      }
      limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(rawLimit)));
    }

    checkRateLimit(uid);

    const key = `${normaliseQuery(trimmed)}::${limit}`;
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && hit.expires > now) {
      logger.info("geocode cache hit", { uid, limit, cacheSize: cache.size });
      return { results: hit.results };
    }

    logger.info("geocode cache miss", { uid, limit, cacheSize: cache.size });

    const results = await enqueueNominatim(() =>
      fetchNominatim(trimmed, limit)
    );

    cache.set(key, { expires: now + CACHE_TTL_MS, results });
    pruneCache();

    return { results };
  }
);
