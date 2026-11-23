import { biomeOf } from './biomes';
import { createNoise, lerp, smoothstep } from './noise';

export interface Bump {
  x: number;
  z: number;
  r: number;
  /** Positive = hill, negative = pond. */
  h: number;
}

export interface IslandSpec {
  /** Index used to vary noise per island. */
  i: number;
  x: number;
  z: number;
  /** Half-extent in x / z (world units). */
  rx: number;
  rz: number;
  kind: string;
  locked: boolean;
  peak: { x: number; z: number; h: number; r: number } | null;
  bumps: Bump[];
}

export interface Bounds {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface TerrainSpec {
  seed: number;
  bounds: Bounds;
  segX: number;
  segZ: number;
  islands: IslandSpec[];
}

export interface TerrainData {
  /** (segX+1)*(segZ+1) heights, row-major along x then z. */
  heights: Float32Array;
  /** RGB per vertex in linear-sRGB (what three.js expects for vertex colours). */
  colors: Float32Array;
  /** Island index owning each vertex (-1 = open sea). */
  owner: Int16Array;
  segX: number;
  segZ: number;
  bounds: Bounds;
}

export const SEA_FLOOR = -6;
const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const GREY: [number, number, number] = hex('#b7c1cf');
const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

/** Height function shared by the worker (mesh) and tests. */
export function makeHeightFn(spec: TerrainSpec) {
  const noise = createNoise(spec.seed);
  const { fbm } = noise;
  return (x: number, z: number): { h: number; i: number } => {
    let best = SEA_FLOOR;
    let bi = -1;
    const warp = fbm(x * 0.045 + 11, z * 0.045 - 7, 3) * 0.2;
    for (const s of spec.islands) {
      const dx = (x - s.x) / s.rx;
      const dz = (z - s.z) / s.rz;
      const d = Math.hypot(dx, dz) / (1 + warp + fbm(x * 0.02 + s.i * 3.1, z * 0.02, 2) * 0.1);
      if (d > 1.45) continue;
      let h = SEA_FLOOR + 5.4 * smoothstep(1.38, 1.0, d) + 1.05 * smoothstep(1.0, 0.86, d);
      h += smoothstep(0.9, 0.62, d) * (1.25 + fbm(x * 0.11 + s.i, z * 0.11, 4) * 0.95);
      if (s.peak) {
        const pd = Math.hypot(x - s.peak.x, z - s.peak.z) / s.peak.r;
        h += Math.pow(Math.max(0, 1 - pd), 1.55) * s.peak.h * (0.86 + 0.28 * fbm(x * 0.2, z * 0.2, 3));
        if (s.kind === 'volcano') h -= Math.pow(Math.max(0, 1 - pd / 0.16), 2) * 3.2;
      }
      for (const b of s.bumps) {
        const bd = Math.hypot(x - b.x, z - b.z) / b.r;
        if (bd < 1) h += b.h * Math.pow(1 - bd, 2) * (b.h < 0 ? 1 : 0.9 + 0.2 * fbm(x * 0.3, z * 0.3, 2));
      }
      h += fbm(x * 0.55, z * 0.55, 2) * 0.08 * smoothstep(1.0, 0.8, d);
      if (h > best) {
        best = h;
        bi = s.i;
      }
    }
    return { h: best, i: bi };
  };
}

/** Generates heights + vertex colours for a terrain grid. Pure; runs in a Web Worker. */
export function generateTerrain(spec: TerrainSpec): TerrainData {
  const { segX, segZ, bounds } = spec;
  const nx = segX + 1;
  const nz = segZ + 1;
  const heights = new Float32Array(nx * nz);
  const owner = new Int16Array(nx * nz);
  const colors = new Float32Array(nx * nz * 3);
  const hf = makeHeightFn(spec);
  const { fbm } = createNoise(spec.seed ^ 0x5bd1e995);
  const byIndex = new Map(spec.islands.map((s) => [s.i, s]));
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const x = lerp(bounds.x0, bounds.x1, i / segX);
      const z = lerp(bounds.z0, bounds.z1, j / segZ);
      const r = hf(x, z);
      heights[j * nx + i] = r.h;
      owner[j * nx + i] = r.i;
    }
  const dx = (bounds.x1 - bounds.x0) / segX;
  const dz = (bounds.z1 - bounds.z0) / segZ;
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const h = heights[k]!;
      const s = byIndex.get(owner[k]!);
      const B = biomeOf(s?.kind ?? 'palm');
      const x = lerp(bounds.x0, bounds.x1, i / segX);
      const z = lerp(bounds.z0, bounds.z1, j / segZ);
      const hx = (heights[j * nx + Math.min(nx - 1, i + 1)]! - heights[j * nx + Math.max(0, i - 1)]!) / (2 * dx);
      const hz = (heights[Math.min(nz - 1, j + 1) * nx + i]! - heights[Math.max(0, j - 1) * nx + i]!) / (2 * dz);
      const slope = Math.hypot(hx, hz);
      const n = fbm(x * 0.18, z * 0.18, 3);
      const n2 = fbm(x * 0.9 + 5, z * 0.9, 2);
      let c: [number, number, number];
      const sand = hex(B.sand);
      if (h < -0.15) c = sand.map((v) => v * lerp(0.92, 0.62, smoothstep(-0.15, -3.5, h))) as [number, number, number];
      else if (h < 0.62) c = sand.map((v) => Math.min(1, v * (1 + n2 * 0.04))) as [number, number, number];
      else {
        c = mix(hex(B.grass[0]), hex(B.grass[1]), smoothstep(-0.3, 0.45, n));
        c = c.map((v) => Math.min(1, v * (1 + n2 * 0.06))) as [number, number, number];
        if (h < 0.85) c = mix(c, sand, smoothstep(0.85, 0.62, h));
        if (slope > 0.42) c = mix(c, hex(B.rock), smoothstep(0.42, 0.9, slope));
        if (s?.peak && h > 4.2) {
          if (B.snow) c = mix(c, hex(B.snow), smoothstep(5.2, 7.5, h + n * 1.5));
          if (B.basalt) c = mix(c, hex(B.basalt), smoothstep(3.5, 6, h));
        }
      }
      if (s?.locked) {
        const l = (c[0] + c[1] + c[2]) / 3;
        c = mix(c, mix([l, l, l], GREY, 0.45), 0.62);
      }
      colors[k * 3] = toLinear(c[0]);
      colors[k * 3 + 1] = toLinear(c[1]);
      colors[k * 3 + 2] = toLinear(c[2]);
    }
  return { heights, colors, owner, segX, segZ, bounds };
}

/** Bilinear height lookup on a generated grid. */
export function sampleHeight(
  t: Pick<TerrainData, 'heights' | 'segX' | 'segZ' | 'bounds'>,
  x: number,
  z: number,
): number {
  const { bounds, segX, segZ, heights } = t;
  const fx = Math.min(segX, Math.max(0, ((x - bounds.x0) / (bounds.x1 - bounds.x0)) * segX));
  const fz = Math.min(segZ, Math.max(0, ((z - bounds.z0) / (bounds.z1 - bounds.z0)) * segZ));
  const i = Math.min(segX - 1, Math.floor(fx));
  const j = Math.min(segZ - 1, Math.floor(fz));
  const u = fx - i;
  const v = fz - j;
  const nx = segX + 1;
  const h00 = heights[j * nx + i]!;
  const h10 = heights[j * nx + i + 1]!;
  const h01 = heights[(j + 1) * nx + i]!;
  const h11 = heights[(j + 1) * nx + i + 1]!;
  return lerp(lerp(h00, h10, u), lerp(h01, h11, u), v);
}

/** Packs heights into an 8-bit texture for the water shader (depth tint + foam). */
export function heightTexture(t: TerrainData): Uint8Array {
  const out = new Uint8Array(t.heights.length);
  for (let k = 0; k < t.heights.length; k++)
    out[k] = Math.round(Math.min(1, Math.max(0, (t.heights[k]! - SEA_FLOOR) / 8)) * 255);
  return out;
}
