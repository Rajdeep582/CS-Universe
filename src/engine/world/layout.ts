import type { Curriculum, Level, Stage, World } from '../content/schema';
import { biomeOf } from './biomes';
import { hashString, mulberry32 } from './noise';
import type { Bounds, IslandSpec } from './terrain';

export interface Point {
  x: number;
  z: number;
}

// ───────────────────────── World Map ─────────────────────────

export interface WorldIsland {
  world: World;
  spec: IslandSpec;
  /** Where the stage flags sit, in stage order. */
  stageSpots: (Point & { stageId: string })[];
  /** Sea-route waypoint just off the island's south shore. */
  dock: Point;
}

export interface WorldLayout {
  islands: WorldIsland[];
  bounds: Bounds;
  route: Point[];
}

const COLS = 4;
const DX = 76;
const DZ = 70;

/** Serpentine grid of islands in world order; grows with the number of worlds. */
export function worldLayout(c: Curriculum, locked: (w: World) => boolean): WorldLayout {
  const n = c.worlds.length;
  const rows = Math.ceil(n / COLS);
  const islands: WorldIsland[] = c.worlds.map((w, i) => {
    const row = Math.floor(i / COLS);
    let col = i % COLS;
    if (row % 2 === 1) col = COLS - 1 - col;
    const x = (col - (COLS - 1) / 2) * DX + (row % 2 ? 6 : 0) + (i % 2 ? 3 : -3);
    const z = (row - (rows - 1) / 2) * DZ + (col % 2 ? 6 : -4);
    const R = 22.5;
    const rx = R * 1.2;
    const rz = R * 0.82;
    const b = biomeOf(w.biomeKind);
    const spec: IslandSpec = {
      i,
      x,
      z,
      rx,
      rz,
      kind: w.biomeKind,
      locked: locked(w),
      peak: b.peak ? { x: x + (i % 2 ? 4 : -5), z: z - 3, h: b.peak, r: R * 0.55 } : null,
      bumps: [],
    };
    const k = w.stageIds.length;
    // Zig-zag across the island so neighbouring stage cards sit on alternate rows.
    const stageSpots = w.stageIds.map((stageId, j) => {
      const u = k === 1 ? 0 : j / (k - 1) - 0.5;
      return { stageId, x: x + u * rx * 1.15, z: z + (j % 2 ? 0.28 : -0.22) * rz };
    });
    return { world: w, spec, stageSpots, dock: { x, z: z + rz * 1.08 } };
  });
  const margin = 80;
  const xs = islands.map((s) => s.spec.x);
  const zs = islands.map((s) => s.spec.z);
  const bounds = {
    x0: Math.min(...xs) - margin,
    x1: Math.max(...xs) + margin,
    z0: Math.min(...zs) - margin,
    z1: Math.max(...zs) + margin,
  };
  return { islands, bounds, route: islands.map((s) => s.dock) };
}

// ───────────────────────── Stage ─────────────────────────

export interface Pedestal extends Point {
  levelId: string;
  number: number;
}
export interface Chest extends Point {
  levelId: string;
  hostId: string;
}
export interface Signpost extends Point {
  unitId: string;
  title: string;
  index: number;
}

export interface StageLayout {
  island: IslandSpec;
  bounds: Bounds;
  pedestals: Pedestal[];
  chests: Chest[];
  signposts: Signpost[];
  castle: Point;
  dock: Point;
  /** Road control points: dock → every pedestal in order → castle. */
  road: Point[];
}

const STEP_X = 15;
const STEP_Z = 18;
const MIN_GAP = 7.5;

/** Places a stage's levels on a serpentine road, bonus chests beside their host levels, signposts at each unit's first level, and the castle at the end. Pure and deterministic. */
export function stageLayout(stage: Stage, levels: Level[], biomeKind: string): StageLayout {
  const rand = mulberry32(hashString(stage.id));
  const core = levels.filter((l) => l.number !== null).sort((a, b) => a.number! - b.number!);
  const n = core.length;
  const perRow = n <= 9 ? Math.max(n, 1) : n <= 24 ? 6 : 7;
  const rows = Math.ceil(n / perRow);
  const width = (perRow - 1) * STEP_X;
  const depth = (rows - 1) * STEP_Z;
  const pedestals: Pedestal[] = core.map((l, k) => {
    const row = Math.floor(k / perRow);
    const col = k % perRow;
    const c = row % 2 === 0 ? col : perRow - 1 - col;
    const x = -width / 2 + c * STEP_X;
    const wiggle = rows === 1 ? -10 * Math.sin((k + 0.5) * 0.95) : (rand() - 0.5) * 4;
    const z = depth / 2 - row * STEP_Z + wiggle;
    return { levelId: l.id, number: l.number!, x, z };
  });
  const last = pedestals[n - 1] ?? { x: 0, z: 0 };
  const lastRowDir = Math.floor((n - 1) / perRow) % 2 === 0 ? 1 : -1;
  const castle = { x: last.x + lastRowDir * 6, z: last.z - 22 };
  const first: Pedestal = pedestals[0] ?? { levelId: '', number: 0, x: 0, z: 0 };
  const dock = { x: first.x - 14, z: first.z + 20 };

  // Bonus chests: beside the host pedestal, alternating sides, nudged until clear.
  const occupied: Point[] = [...pedestals, castle];
  const chests: Chest[] = [];
  const pos = new Map(pedestals.map((p) => [p.levelId, p]));
  const bonus = levels.filter((l) => l.number === null);
  const perHost = new Map<string, number>();
  for (const b of bonus) {
    const host = pos.get(b.hostLevelId ?? '') ?? first;
    const k = perHost.get(host.levelId) ?? 0;
    perHost.set(host.levelId, k + 1);
    let placed: Point | null = null;
    for (let attempt = 0; attempt < 24 && !placed; attempt++) {
      const side = (k + attempt) % 2 === 0 ? -1 : 1;
      const ring = 1 + Math.floor((k + attempt) / 2) * 0.55;
      const cand = { x: host.x + ((k % 3) - 1) * 4.5 + (rand() - 0.5) * 2, z: host.z + side * 9 * ring };
      if (occupied.every((o) => Math.hypot(o.x - cand.x, o.z - cand.z) >= MIN_GAP)) placed = cand;
    }
    placed ??= { x: host.x + 6 + k * MIN_GAP, z: host.z + 12 };
    occupied.push(placed);
    chests.push({ levelId: b.id, hostId: host.levelId, ...placed });
  }

  // Signposts at the first level of each unit.
  const signposts: Signpost[] = [];
  stage.units.forEach((u, index) => {
    const firstCore = u.levelIds.map((id) => pos.get(id)).find(Boolean);
    if (!firstCore) return;
    signposts.push({ unitId: u.id, title: u.title, index, x: firstCore.x - 9, z: firstCore.z - 6 });
  });

  const xs = [...occupied.map((p) => p.x), dock.x];
  const zs = [...occupied.map((p) => p.z), dock.z];
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + 26;
  const rz = (Math.max(...zs) - Math.min(...zs)) / 2 + 24;
  const b = biomeOf(biomeKind);
  // Peak sits in the corner the road leaves free (back-left of the island).
  const peak = b.peak ? { x: cx - rx * 0.62, z: cz - rz * 0.62, h: b.peak * 1.1, r: Math.min(rx, rz) * 0.42 } : null;
  const island: IslandSpec = {
    i: 0,
    x: cx,
    z: cz,
    rx: rx * 1.08,
    rz: rz * 1.1,
    kind: biomeKind,
    locked: false,
    peak,
    bumps: [{ x: castle.x, z: castle.z, r: 16, h: 3 }],
  };
  return {
    island,
    bounds: { x0: cx - rx * 1.6 - 40, x1: cx + rx * 1.6 + 40, z0: cz - rz * 1.6 - 40, z1: cz + rz * 1.6 + 40 },
    pedestals,
    chests,
    signposts,
    castle,
    dock,
    road: [dock, ...pedestals, { x: castle.x, z: castle.z + 9 }],
  };
}
