"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Globe } from "@/components/globe/Globe";
import { subscribeToGlobe, subscribeToPins } from "@/lib/firebase/globes";
import { extractGlobeIdFromRoute } from "@/lib/globe-routes";
import { getThemeColors } from "@/lib/themes";
import { sanitizeExternalUrl } from "@/lib/url";
import {
  DEFAULT_BEHAVIOUR,
  DEFAULT_PIN_STYLE,
  DEFAULT_THEME_COLORS,
} from "@/lib/defaults";
import type { Globe as GlobeDoc, Pin } from "@/lib/types";

// TODO(branding): hide credit when globe.branding === false on paid tier.
const MARKETING_URL = "https://globeify.web.app";

export default function EmbedRoute() {
  const pathname = usePathname();
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const globeId = extractGlobeIdFromRoute("embed", pathname, searchParams);
  const isPlaceholder = !globeId;

  const [globe, setGlobe] = useState<GlobeDoc | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "missing" | "error">(
    "loading"
  );

  // Subscribe to globe + pins.
  // Pins subscription only opens once the globe is confirmed published,
  // avoiding a permission-denied error on unpublished globes.
  useEffect(() => {
    if (isPlaceholder) return;

    let cancelled = false;
    let unsubPins: (() => void) | null = null;

    const unsubGlobe = subscribeToGlobe(
      globeId,
      (g) => {
        if (cancelled) return;
        if (!g || !g.isPublished) {
          setGlobe(null);
          setStatus("missing");
          return;
        }
        setGlobe(g);
        setStatus("ok");
        if (!unsubPins) {
          unsubPins = subscribeToPins(
            globeId,
            (p) => { if (!cancelled) setPins(p); },
            () => {}
          );
        }
      },
      () => {
        if (cancelled) return;
        setStatus("error");
      }
    );

    return () => {
      cancelled = true;
      unsubGlobe();
      if (unsubPins) unsubPins();
    };
  }, [globeId, isPlaceholder]);

  const selectedPin = useMemo(
    () => (selectedPinId ? pins.find((p) => p.id === selectedPinId) ?? null : null),
    [pins, selectedPinId]
  );

  if (isPlaceholder) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: DEFAULT_THEME_COLORS.background,
          color: "#666",
          fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        Loading…
      </div>
    );
  }

  if (status === "missing" || status === "error") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#777",
          fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        Globe not available
      </div>
    );
  }

  const colors = globe ? getThemeColors(globe.themePreset, globe.themeColors) : DEFAULT_THEME_COLORS;
  const behaviour = globe?.behaviour ?? DEFAULT_BEHAVIOUR;
  const pinStyle = globe?.pinStyle ?? DEFAULT_PIN_STYLE;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: colors.background,
        overflow: "hidden",
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
      }}
    >
      <Globe
        minimal
        colors={colors}
        behaviour={behaviour}
        pinStyle={pinStyle}
        pins={pins}
        selectedPinId={selectedPinId}
        onPinSelect={(pin) => setSelectedPinId(pin ? pin.id : null)}
        className="absolute inset-0"
      />

      {selectedPin && (
        <PinDetailCard
          pin={selectedPin}
          colors={colors}
          onClose={() => setSelectedPinId(null)}
        />
      )}

      <a
        href={MARKETING_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "absolute",
          right: 12,
          bottom: 10,
          fontSize: 10,
          letterSpacing: 0.3,
          color: colors.pin,
          opacity: 0.4,
          textDecoration: "none",
          padding: "4px 8px",
          background: "transparent",
          pointerEvents: "auto",
        }}
      >
        Made with Globeify
      </a>
    </div>
  );
}

function PinDetailCard({
  pin,
  colors,
  onClose,
}: {
  pin: Pin;
  colors: { background: string; land: string; border: string; pin: string };
  onClose: () => void;
}) {
  const safeUrl = sanitizeExternalUrl(pin.url);
  // Derive a card background that sits just above the globe background by
  // using the land colour — this keeps the card on-theme for light/dark.
  const isDark = isColorDark(colors.background);
  const cardBg = colors.land;
  const textColor = isDark ? "#f4f4f4" : "#1a1a1a";
  const mutedColor = isDark ? "#8a8a8a" : "#5a5a5a";

  return (
    <div
      style={{
        position: "absolute",
        left: 20,
        bottom: 20,
        maxWidth: "min(320px, calc(100vw - 40px))",
        minWidth: 200,
        background: cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: "16px 20px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        color: textColor,
        zIndex: 10,
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: 8,
          right: 10,
          background: "none",
          border: "none",
          color: mutedColor,
          fontSize: 16,
          cursor: "pointer",
          lineHeight: 1,
          padding: 4,
        }}
      >
        ×
      </button>
      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          marginBottom: 4,
          paddingRight: 20,
          color: textColor,
        }}
      >
        {pin.name}
      </div>
      <div
        style={{
          fontSize: 11,
          color: mutedColor,
          marginBottom: pin.description || safeUrl ? 8 : 0,
          fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
        }}
      >
        {pin.lat.toFixed(4)}°, {pin.lng.toFixed(4)}°
      </div>
      {pin.description && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: mutedColor,
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
          }}
        >
          {pin.description}
        </div>
      )}
      {safeUrl && (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            marginTop: 10,
            fontSize: 12,
            color: textColor,
            textDecoration: "none",
            borderBottom: `1px solid ${colors.border}`,
            paddingBottom: 1,
          }}
        >
          Learn more →
        </a>
      )}
    </div>
  );
}

function isColorDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return true;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Rec. 709 luma
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 128;
}
