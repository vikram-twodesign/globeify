import type { ThemeColors } from "@/lib/types";
import {
  type Feature,
  lngLatToPixel,
  splitRingAtAntimeridian,
} from "./topo";

export interface BuildGlobeTextureOptions {
  features: Feature[];
  colors: ThemeColors;
  showGraticule: boolean;
  showBorders: boolean;
  /** Width of the canvas texture in pixels. Default 4096. Height = width/2. */
  texSize?: number;
}

/**
 * Convert a `#rrggbb` string into an `rgba(r,g,b,a)` string so that we can
 * draw overlays (graticule, borders, coastline) at reduced opacity while
 * still pulling the colour from the theme.
 */
function withAlpha(hex: string, alpha: number): string {
  const trimmed = hex.trim();
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
  if (!match) return trimmed;
  let h = match[1];
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Build a world-map canvas texture for the globe given the decoded TopoJSON
 * features and theme colours.  The texture is in equirectangular projection
 * so it can be wrapped onto a `SphereGeometry` directly.
 */
export function buildGlobeTexture({
  features,
  colors,
  showGraticule,
  showBorders,
  texSize = 4096,
}: BuildGlobeTextureOptions): HTMLCanvasElement {
  const texW = Math.max(256, Math.floor(texSize));
  const texH = Math.floor(texW / 2);

  const canvas = document.createElement("canvas");
  canvas.width = texW;
  canvas.height = texH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Ocean / background
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, texW, texH);

  // Graticule — theme border colour at very low opacity
  if (showGraticule) {
    ctx.strokeStyle = withAlpha(colors.border, 0.25);
    ctx.lineWidth = 1;
    for (let lat = -80; lat <= 80; lat += 20) {
      const [, y] = lngLatToPixel(0, lat, texW, texH);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(texW, y);
      ctx.stroke();
    }
    for (let lng = -180; lng < 180; lng += 20) {
      const [x] = lngLatToPixel(lng, 0, texW, texH);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, texH);
      ctx.stroke();
    }
  }

  // Land fills
  ctx.fillStyle = colors.land;
  for (const feature of features) {
    for (const polygon of feature.polygons) {
      ctx.beginPath();
      for (let r = 0; r < polygon.length; r++) {
        const ring = polygon[r];
        if (ring.length < 3) continue;
        const segments = splitRingAtAntimeridian(ring);
        for (const seg of segments) {
          if (seg.length === 0) continue;
          const [sx, sy] = lngLatToPixel(seg[0][0], seg[0][1], texW, texH);
          ctx.moveTo(sx, sy);
          for (let i = 1; i < seg.length; i++) {
            const [px, py] = lngLatToPixel(seg[i][0], seg[i][1], texW, texH);
            ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
      }
      ctx.fill("evenodd");
    }
  }

  // Country borders — inner rings included
  if (showBorders) {
    ctx.strokeStyle = withAlpha(colors.border, 0.6);
    ctx.lineWidth = 1.2;
    for (const feature of features) {
      for (const polygon of feature.polygons) {
        for (let r = 0; r < polygon.length; r++) {
          const ring = polygon[r];
          if (!ring || ring.length < 3) continue;
          const segments = splitRingAtAntimeridian(ring);
          for (const seg of segments) {
            if (seg.length === 0) continue;
            ctx.beginPath();
            const [sx, sy] = lngLatToPixel(seg[0][0], seg[0][1], texW, texH);
            ctx.moveTo(sx, sy);
            for (let i = 1; i < seg.length; i++) {
              const [px, py] = lngLatToPixel(seg[i][0], seg[i][1], texW, texH);
              ctx.lineTo(px, py);
            }
            ctx.stroke();
          }
        }
      }
    }
  }

  // Coastline — outer ring only, slightly brighter
  ctx.strokeStyle = withAlpha(colors.border, 0.9);
  ctx.lineWidth = 1.5;
  for (const feature of features) {
    for (const polygon of feature.polygons) {
      const ring = polygon[0];
      if (!ring || ring.length < 3) continue;
      const segments = splitRingAtAntimeridian(ring);
      for (const seg of segments) {
        if (seg.length === 0) continue;
        ctx.beginPath();
        const [sx, sy] = lngLatToPixel(seg[0][0], seg[0][1], texW, texH);
        ctx.moveTo(sx, sy);
        for (let i = 1; i < seg.length; i++) {
          const [px, py] = lngLatToPixel(seg[i][0], seg[i][1], texW, texH);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
  }

  return canvas;
}
