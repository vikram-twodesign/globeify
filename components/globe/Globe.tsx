"use client";

import { useEffect, useRef, useState } from "react";
import type {
  GlobeBehaviour,
  Pin,
  PinStyle,
  ThemeColors,
} from "@/lib/types";
import { GlobeScene } from "./globeCore";
import { decodeTopo, type Feature, type TopoJSON } from "./topo";

const TOPO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

let featuresPromise: Promise<Feature[]> | null = null;

/** Fetch + decode the country topology once and share between Globe instances. */
function loadFeatures(): Promise<Feature[]> {
  if (featuresPromise) return featuresPromise;
  featuresPromise = fetch(TOPO_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`topology fetch failed: ${r.status}`);
      return r.json() as Promise<TopoJSON>;
    })
    .then((topo) => decodeTopo(topo))
    .catch((err) => {
      // Reset so subsequent Globe mounts can retry.
      featuresPromise = null;
      throw err;
    });
  return featuresPromise;
}

export interface GlobeProps {
  colors: ThemeColors;
  behaviour: GlobeBehaviour;
  pinStyle: PinStyle;
  pins: Pin[];
  selectedPinId?: string | null;
  onPinSelect?: (pin: Pin | null) => void;
  onPinHover?: (pin: Pin | null, clientX: number, clientY: number) => void;
  className?: string;
  /** Skip hover tooltip + other interactive chrome — used for embed thumbnails. */
  minimal?: boolean;
}

export function Globe({
  colors,
  behaviour,
  pinStyle,
  pins,
  selectedPinId,
  onPinSelect,
  onPinHover,
  className,
  minimal = false,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<GlobeScene | null>(null);

  // Keep latest callbacks accessible without reconstructing the scene.
  const onPinSelectRef = useRef(onPinSelect);
  const onPinHoverRef = useRef(onPinHover);
  useEffect(() => {
    onPinSelectRef.current = onPinSelect;
  }, [onPinSelect]);
  useEffect(() => {
    onPinHoverRef.current = onPinHover;
  }, [onPinHover]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  // Mount / unmount the Three.js scene.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    const scene = new GlobeScene({
      mount: el,
      colors,
      behaviour,
      pinStyle,
      pins,
      onPinSelect: (pin) => onPinSelectRef.current?.(pin),
      onPinHover: minimal
        ? undefined
        : (pin, x, y) => onPinHoverRef.current?.(pin, x, y),
    });
    sceneRef.current = scene;

    loadFeatures()
      .then((features) => {
        if (cancelled) return;
        scene.setFeatures(features);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadFailed(true);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      scene.destroy();
      sceneRef.current = null;
    };
    // Intentionally only run on mount / unmount; prop-driven updates use the
    // dedicated effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minimal]);

  // Theme colours + graticule/border flags affect the texture.
  useEffect(() => {
    sceneRef.current?.setTheme(colors, {
      showGraticule: behaviour.showGraticule,
      showBorders: behaviour.showBorders,
    });
  }, [
    colors.background,
    colors.land,
    colors.border,
    colors.pin,
    behaviour.showGraticule,
    behaviour.showBorders,
  ]);

  // Other behaviour changes (rotation speed, autoRotate, idle behaviour).
  useEffect(() => {
    sceneRef.current?.setBehaviour(behaviour);
  }, [
    behaviour.autoRotate,
    behaviour.rotationSpeed,
    behaviour.idleBehaviour,
    behaviour.showGraticule,
    behaviour.showBorders,
  ]);

  // Pin style changes (size, ring, pulse).
  useEffect(() => {
    sceneRef.current?.setPinStyle(pinStyle);
  }, [pinStyle.size, pinStyle.showRing, pinStyle.pulse]);

  // Pin list changes.
  useEffect(() => {
    sceneRef.current?.setPins(pins);
  }, [pins]);

  // Externally-driven focus (e.g. sidebar selects a pin).
  useEffect(() => {
    if (!selectedPinId) return;
    sceneRef.current?.focusPin(selectedPinId);
  }, [selectedPinId]);

  const rootClass = [
    "relative w-full h-full overflow-hidden",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ background: colors.background }}
      />
      {isLoading && !loadFailed && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ background: colors.background }}
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2"
            style={{
              borderColor: "var(--border)",
              borderTopColor: "var(--muted-foreground)",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default Globe;
