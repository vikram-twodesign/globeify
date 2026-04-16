import * as THREE from "three";

/**
 * TopoJSON decoding utilities (framework-agnostic).
 *
 * The shapes below describe the minimal subset of the world-atlas
 * countries-110m.json format that we actually need.
 */

export interface Feature {
  /** polygons[polygonIdx][ringIdx][pointIdx] = [lng, lat] */
  polygons: number[][][][];
}

interface TopoTransform {
  scale: [number, number];
  translate: [number, number];
}

interface TopoGeometryPolygon {
  type: "Polygon";
  arcs: number[][];
}

interface TopoGeometryMultiPolygon {
  type: "MultiPolygon";
  arcs: number[][][];
}

type TopoGeometry = TopoGeometryPolygon | TopoGeometryMultiPolygon;

interface TopoObject {
  type: string;
  geometries?: TopoGeometry[];
  arcs?: number[][] | number[][][];
}

export interface TopoJSON {
  type: "Topology";
  objects: Record<string, TopoObject>;
  arcs: number[][][];
  transform?: TopoTransform;
}

/**
 * Decode a TopoJSON payload into a flat list of features whose polygons
 * are expressed as [lng, lat] coordinate rings.
 */
export function decodeTopo(topo: TopoJSON): Feature[] {
  const objKey = Object.keys(topo.objects)[0];
  const obj = topo.objects[objKey];
  const arcs = topo.arcs;
  const tr = topo.transform;

  function decodeArc(idx: number): number[][] {
    const rev = idx < 0;
    const i = rev ? ~idx : idx;
    const arc = arcs[i];
    const coords: number[][] = [];
    let x = 0;
    let y = 0;
    for (let j = 0; j < arc.length; j++) {
      x += arc[j][0];
      y += arc[j][1];
      if (tr) {
        coords.push([
          x * tr.scale[0] + tr.translate[0],
          y * tr.scale[1] + tr.translate[1],
        ]);
      } else {
        coords.push([x, y]);
      }
    }
    if (rev) coords.reverse();
    return coords;
  }

  function decodeRing(ring: number[]): number[][] {
    let coords: number[][] = [];
    for (let i = 0; i < ring.length; i++) {
      const d = decodeArc(ring[i]);
      if (i > 0) d.shift();
      coords = coords.concat(d);
    }
    return coords;
  }

  const features: Feature[] = [];
  const geometries: TopoGeometry[] = obj.geometries ?? [];

  for (const geom of geometries) {
    const polys: number[][][][] = [];
    if (geom.type === "Polygon") {
      polys.push(geom.arcs.map((ring) => decodeRing(ring)));
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.arcs) {
        polys.push(poly.map((ring) => decodeRing(ring)));
      }
    }
    features.push({ polygons: polys });
  }
  return features;
}

/**
 * Split a ring at the antimeridian (±180°) so that drawing the ring on a
 * flat equirectangular canvas does not produce edges that traverse the
 * entire globe horizontally.
 */
export function splitRingAtAntimeridian(ring: number[][]): number[][][] {
  if (ring.length === 0) return [];
  const segments: number[][][] = [];
  let current: number[][] = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    const prevLng = ring[i - 1][0];
    const currLng = ring[i][0];
    if (Math.abs(currLng - prevLng) > 180) {
      segments.push(current);
      current = [ring[i]];
    } else {
      current.push(ring[i]);
    }
  }
  segments.push(current);
  return segments;
}

/** Convert a (lng, lat) pair to pixel coordinates on an equirectangular canvas. */
export function lngLatToPixel(
  lng: number,
  lat: number,
  texW: number,
  texH: number
): [number, number] {
  const x = ((lng + 180) / 360) * texW;
  const y = ((90 - lat) / 180) * texH;
  return [x, y];
}

/** Convert (lat, lng) on a sphere of radius r to a Three.js Vector3. */
export function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}
