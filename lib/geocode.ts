"use client";

import {
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import { getFns } from "@/lib/firebase/client";

export interface GeocodeResult {
  name: string;
  lat: number;
  lng: number;
  displayName: string;
  type?: string;
  country?: string;
}

interface GeocodePayload {
  results: GeocodeResult[];
}

let connected = false;
function ensureEmulator(): void {
  if (connected) return;
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
  ) {
    connectFunctionsEmulator(getFns(), "localhost", 5001);
  }
  connected = true;
}

/**
 * Search for a place via the `geocode` callable (proxies Nominatim).
 * Debouncing is the caller's responsibility.
 */
export async function searchGeocode(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];
  ensureEmulator();
  const callable = httpsCallable<{ query: string; limit?: number }, GeocodePayload>(
    getFns(),
    "geocode"
  );
  const res = await callable({ query: q, limit: 5 });
  const data = res.data;
  if (!data || !Array.isArray(data.results)) return [];
  return data.results;
}
