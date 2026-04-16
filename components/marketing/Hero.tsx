"use client";

import Link from "next/link";
import { Globe } from "@/components/globe/Globe";
import { THEME_PRESETS } from "@/lib/themes";
import type { Pin } from "@/lib/types";

const HERO_PINS: Pin[] = [
  { id: "tyo", name: "Tokyo", lat: 35.6762, lng: 139.6503, description: null, url: null, sortOrder: 0 },
  { id: "bom", name: "Mumbai", lat: 19.076, lng: 72.8777, description: null, url: null, sortOrder: 1 },
  { id: "ist", name: "Istanbul", lat: 41.0082, lng: 28.9784, description: null, url: null, sortOrder: 2 },
  { id: "nyc", name: "New York", lat: 40.7128, lng: -74.006, description: null, url: null, sortOrder: 3 },
  { id: "sao", name: "São Paulo", lat: -23.5505, lng: -46.6333, description: null, url: null, sortOrder: 4 },
  { id: "cpt", name: "Cape Town", lat: -33.9249, lng: 18.4241, description: null, url: null, sortOrder: 5 },
  { id: "syd", name: "Sydney", lat: -33.8688, lng: 151.2093, description: null, url: null, sortOrder: 6 },
];

export function Hero() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-24 md:pt-24 md:pb-32">
      <div className="grid items-center gap-12 md:grid-cols-[1.15fr_1fr] md:gap-16">
        <div className="order-2 md:order-1">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Interactive world maps &middot; Made for the open web
          </p>
          <h1 className="font-display text-5xl leading-[1.05] text-foreground sm:text-6xl md:text-7xl">
            Beautiful globes,
            <br />
            embedded anywhere.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Calendly for interactive world maps. Build a refined 3D globe,
            drop a few pins, and paste one line of code into any site.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85"
            >
              Create your own
            </Link>
            <a
              href="#showcase"
              className="inline-flex h-11 items-center rounded-md px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              See live example &rarr;
            </a>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <div className="relative mx-auto aspect-square w-full max-w-[520px] min-h-[320px]">
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at center, transparent 55%, rgba(0,0,0,0.6) 100%)",
              }}
            />
            <Globe
              colors={THEME_PRESETS.graphite.colors}
              behaviour={{
                autoRotate: true,
                rotationSpeed: "medium",
                showGraticule: true,
                showBorders: true,
                idleBehaviour: "resume",
              }}
              pinStyle={{ size: "medium", showRing: true, pulse: false }}
              pins={HERO_PINS}
              className="rounded-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
