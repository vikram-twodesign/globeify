"use client";

import { Globe } from "@/components/globe/Globe";
import { THEME_PRESETS } from "@/lib/themes";
import type { Pin } from "@/lib/types";

const SHOWCASE_PINS: Pin[] = [
  { id: "lon", name: "London", lat: 51.5074, lng: -0.1278, description: null, url: null, sortOrder: 0 },
  { id: "par", name: "Paris", lat: 48.8566, lng: 2.3522, description: null, url: null, sortOrder: 1 },
  { id: "nyc", name: "New York", lat: 40.7128, lng: -74.006, description: null, url: null, sortOrder: 2 },
  { id: "sfo", name: "San Francisco", lat: 37.7749, lng: -122.4194, description: null, url: null, sortOrder: 3 },
  { id: "sin", name: "Singapore", lat: 1.3521, lng: 103.8198, description: null, url: null, sortOrder: 4 },
];

export function Showcase() {
  return (
    <section id="showcase" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <p className="mb-10 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        &sect; made with globeify
      </p>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
          </div>
          <div className="ml-2 flex-1 truncate rounded-md bg-background px-3 py-1 font-mono text-[11px] text-muted-foreground">
            yoursite.com
          </div>
        </div>
        <div
          className="relative h-[360px] w-full sm:h-[460px] md:h-[520px]"
          style={{ background: THEME_PRESETS.paper.colors.background }}
        >
          <Globe
            colors={THEME_PRESETS.paper.colors}
            behaviour={{
              autoRotate: true,
              rotationSpeed: "slow",
              showGraticule: false,
              showBorders: true,
              idleBehaviour: "resume",
            }}
            pinStyle={{ size: "medium", showRing: true, pulse: false }}
            pins={SHOWCASE_PINS}
            minimal
          />
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Preview of what your embed looks like on any website.
      </p>
    </section>
  );
}

export default Showcase;
