/** Seeded PRNG (mulberry32): deterministic sequences for layout and props. */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string (FNV-1a) — turns ids into seeds. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const GRAD = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export interface Noise2D {
  simplex(x: number, y: number): number;
  fbm(x: number, y: number, octaves?: number): number;
}

/** 2D simplex noise (Gustavson) with a seeded permutation, plus fractal Brownian motion. Output ≈ [-1, 1]. */
export function createNoise(seed: number): Noise2D {
  const rand = mulberry32(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j]!, p[i]!];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]!;
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;

  function simplex(x: number, y: number): number {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = 1 - i1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let n = 0;
    const corner = (dx: number, dy: number, gi: number) => {
      let tt = 0.5 - dx * dx - dy * dy;
      if (tt <= 0) return;
      tt *= tt;
      const g = GRAD[gi & 7]!;
      n += tt * tt * (g[0] * dx + g[1] * dy);
    };
    corner(x0, y0, perm[ii + perm[jj]!]!);
    corner(x1, y1, perm[ii + i1 + perm[jj + j1]!]!);
    corner(x2, y2, perm[ii + 1 + perm[jj + 1]!]!);
    return 70 * n;
  }

  function fbm(x: number, y: number, octaves = 4): number {
    let a = 1;
    let f = 1;
    let sum = 0;
    let norm = 0;
    for (let k = 0; k < octaves; k++) {
      sum += a * simplex(x * f, y * f);
      norm += a;
      a *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  }

  return { simplex, fbm };
}

export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
