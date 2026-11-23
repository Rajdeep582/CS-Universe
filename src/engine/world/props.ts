import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { biomeOf, leafColors } from './biomes';
import { lerp, mulberry32 } from './noise';
import { sampleHeight, type IslandSpec, type TerrainData } from './terrain';

export interface Instance {
  x: number;
  y: number;
  z: number;
  s?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  color?: string;
}

export interface PropBatch {
  key: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  items: Instance[];
  castShadow: boolean;
}

// ───────────── geometry kit (built once) ─────────────
let KIT: ReturnType<typeof buildKit> | null = null;
function buildKit() {
  const palmSegs: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 7; k++)
    palmSegs.push(
      new THREE.CylinderGeometry(0.11 - k * 0.006, 0.14 - k * 0.006, 0.44, 6)
        .rotateZ(-0.08 * k)
        .translate(0.025 * k * k, k * 0.42 + 0.22, 0),
    );
  const fronds: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 7; k++)
    fronds.push(
      new THREE.ConeGeometry(0.17, 1.7, 4)
        .rotateZ(Math.PI / 2 + 0.55)
        .translate(0.85, -0.25, 0)
        .rotateY((k / 7) * Math.PI * 2),
    );
  fronds.push(new THREE.SphereGeometry(0.2, 8, 6).translate(0.1, -0.15, 0));
  return {
    trunk: new THREE.CylinderGeometry(0.13, 0.2, 1, 6).translate(0, 0.5, 0),
    canopy: mergeGeometries([
      new THREE.IcosahedronGeometry(0.78, 1).scale(1, 0.9, 1).translate(0, 1.45, 0),
      new THREE.IcosahedronGeometry(0.52, 1).translate(0.45, 1.15, 0.2),
      new THREE.IcosahedronGeometry(0.5, 1).translate(-0.42, 1.2, -0.18),
    ])!,
    pine: mergeGeometries([
      new THREE.ConeGeometry(0.85, 1.3, 7).translate(0, 1.05, 0),
      new THREE.ConeGeometry(0.66, 1.1, 7).translate(0, 1.65, 0),
      new THREE.ConeGeometry(0.45, 0.9, 7).translate(0, 2.2, 0),
    ])!,
    palmTrunk: mergeGeometries(palmSegs)!,
    palmTop: mergeGeometries(fronds)!.translate(0.95, 3.0, 0),
    rock: new THREE.DodecahedronGeometry(0.6, 0),
    crystal: new THREE.OctahedronGeometry(0.45, 0).scale(0.55, 1.9, 0.55).translate(0, 0.75, 0),
    box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    roof: new THREE.CylinderGeometry(0.62, 0.62, 1.18, 3)
      .rotateZ(Math.PI / 2)
      .rotateY(Math.PI / 2)
      .scale(1, 0.55, 1)
      .translate(0, 1.18, 0),
    cyl: new THREE.CylinderGeometry(0.5, 0.55, 1, 14).translate(0, 0.5, 0),
    cone: new THREE.ConeGeometry(0.68, 1.1, 14).translate(0, 0.55, 0),
    flower: new THREE.SphereGeometry(0.12, 6, 5),
    bush: mergeGeometries([
      new THREE.IcosahedronGeometry(0.45, 1).translate(0, 0.3, 0),
      new THREE.IcosahedronGeometry(0.34, 1).translate(0.35, 0.22, 0.1),
      new THREE.IcosahedronGeometry(0.3, 1).translate(-0.3, 0.2, -0.1),
    ])!,
    puff: mergeGeometries([
      new THREE.SphereGeometry(3, 14, 10),
      new THREE.SphereGeometry(2.4, 14, 10).translate(2.8, -0.5, 0.5),
      new THREE.SphereGeometry(2.2, 14, 10).translate(-2.7, -0.6, -0.3),
      new THREE.SphereGeometry(1.8, 12, 8).translate(1.2, 1.6, -0.6),
      new THREE.SphereGeometry(1.6, 12, 8).translate(-4.6, -1, 0.4),
    ])!.scale(1, 0.62, 1),
  };
}
export const kit = () => (KIT ??= buildKit());

const std = (o: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, ...o });
let MATS: Record<string, THREE.Material> | null = null;
export const mats = () =>
  (MATS ??= {
    wood: std({ roughness: 0.9 }),
    leaf: std({ flatShading: true, roughness: 0.75 }),
    leafDS: std({ flatShading: true, roughness: 0.7, side: THREE.DoubleSide }),
    rock: std({ flatShading: true, roughness: 0.95 }),
    crystal: std({ flatShading: true, roughness: 0.18, metalness: 0.15, emissive: '#3b1a7a', emissiveIntensity: 0.25 }),
    paint: std({ roughness: 0.7 }),
    paintFlat: std({ flatShading: true }),
    flower: std({ roughness: 0.6 }),
    cloud: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.93 }),
  });

const LOCK_GREY = new THREE.Color('#b7c1cf');
/** Desaturates a colour for locked islands (fog of war). */
export function tint(hex: string, locked: boolean): string {
  if (!locked) return hex;
  const c = new THREE.Color(hex);
  const l = (c.r + c.g + c.b) / 3;
  const g = new THREE.Color(l, l, l).lerp(LOCK_GREY, 0.45);
  return '#' + c.lerp(g, 0.62).getHexString();
}

export interface ScatterOptions {
  dmin?: number;
  dmax?: number;
  hmin?: number;
  slopeMax?: number;
  avoid?: { x: number; z: number; r: number }[];
}

/** Seeded scatter inside an island ellipse honouring height, slope and exclusion zones. */
export function scatter(t: TerrainData, s: IslandSpec, n: number, seed: number, o: ScatterOptions = {}) {
  const { dmin = 0, dmax = 0.78, hmin = 0.8, slopeMax = 0.38, avoid = [] } = o;
  const r = mulberry32(seed + s.i * 97);
  const out: (Instance & { r: number })[] = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 40) {
    const a = r() * Math.PI * 2;
    const rr = Math.sqrt(lerp(dmin * dmin, dmax * dmax, r()));
    const x = s.x + Math.cos(a) * rr * s.rx;
    const z = s.z + Math.sin(a) * rr * s.rz;
    const h = sampleHeight(t, x, z);
    if (h < hmin) continue;
    const sl = Math.hypot(
      sampleHeight(t, x + 0.5, z) - sampleHeight(t, x - 0.5, z),
      sampleHeight(t, x, z + 0.5) - sampleHeight(t, x, z - 0.5),
    );
    if (sl > slopeMax) continue;
    if (avoid.some((p) => Math.hypot(p.x - x, p.z - z) < p.r)) continue;
    out.push({ x, y: h - 0.05, z, r: r(), ry: r() * 6.283 });
  }
  return out;
}

/** Builds instanced prop batches for a set of islands. `density` 0..1 comes from the quality tier; `scale` enlarges props for far views. */
export function buildProps(
  t: TerrainData,
  islands: IslandSpec[],
  density: number,
  scale = 1,
  avoid: ScatterOptions['avoid'] = [],
): PropBatch[] {
  const K = kit();
  const M = mats();
  const B: Record<string, PropBatch> = {};
  const add = (
    key: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    items: Instance[],
    castShadow = true,
  ) => {
    const b = (B[key] ??= { key, geometry, material, items: [], castShadow });
    for (const it of items) b.items.push({ ...it, s: (it.s ?? 1) * scale });
  };
  for (const s of islands) {
    const bio = biomeOf(s.kind);
    const p = bio.props;
    const N = (v = 0) => Math.round(v * density);
    const L = s.locked;
    const leaves = leafColors(bio);
    const pick = <T>(arr: readonly T[], r: number) => arr[Math.floor(r * arr.length) % arr.length]!;
    const o = { avoid };
    const trees = scatter(t, s, N(p.broadleaf), 5, { ...o, slopeMax: 0.6 });
    add(
      'trunk',
      K.trunk,
      M.wood!,
      trees.map((q) => ({ ...q, s: 0.85 + q.r * 0.7, color: tint('#8a5a34', L) })),
    );
    add(
      'canopy',
      K.canopy,
      M.leaf!,
      trees.map((q) => ({ ...q, s: 0.85 + q.r * 0.7, color: tint(pick(leaves, q.r), L) })),
    );
    const pines = scatter(t, s, N(p.pine), 7, { ...o, slopeMax: 0.7 });
    add(
      'pineTrunk',
      K.trunk,
      M.wood!,
      pines.map((q) => ({ ...q, s: 0.55, sy: 0.6, color: tint('#6b4a2e', L) })),
    );
    add(
      'pine',
      K.pine,
      M.leaf!,
      pines.map((q) => ({ ...q, s: 0.8 + q.r * 0.7, color: tint(pick(leaves, q.r), L) })),
    );
    const palms = scatter(t, s, N(p.palm), 3, { ...o, dmin: 0.3, dmax: 0.92, hmin: 0.45 });
    add(
      'palmTrunk',
      K.palmTrunk,
      M.wood!,
      palms.map((q) => ({ ...q, s: 0.9 + q.r * 0.5, color: tint('#a9763e', L) })),
    );
    add(
      'palmTop',
      K.palmTop,
      M.leafDS!,
      palms.map((q) => ({ ...q, s: 0.9 + q.r * 0.5, color: tint(q.r > 0.5 ? '#2fae4f' : '#3fbf57', L) })),
    );
    const crystals = scatter(t, s, N(p.crystal), 10, { ...o, slopeMax: 0.9, hmin: 1 });
    add(
      'crystal',
      K.crystal,
      M.crystal!,
      crystals.map((q) => ({
        ...q,
        s: 0.8 + q.r * 1.6,
        rz: (q.r - 0.5) * 0.5,
        color: tint(pick(p.crystalColors ?? ['#b98cff'], q.r), L),
      })),
    );
    const bushes = scatter(t, s, N(p.bush), 15, o);
    add(
      'bush',
      K.bush,
      M.leaf!,
      bushes.map((q) => ({ ...q, s: 0.8 + q.r * 0.7, color: tint(pick(['#3fae4f', '#58c45a', '#2f9a48'], q.r), L) })),
    );
    const rocks = [
      ...scatter(t, s, N(p.rock), 16, { ...o, dmin: 0.8, dmax: 1, hmin: -0.3, slopeMax: 2 }),
      ...(p.volcano ? scatter(t, s, N(10), 12, { ...o, slopeMax: 0.9 }) : []),
    ];
    add(
      'rock',
      K.rock,
      M.rock!,
      rocks.map((q) => ({ ...q, s: 0.5 + q.r * 1.1, sy: 0.55 + q.r * 0.4, color: tint(bio.rock, L) })),
    );
    const flowers = scatter(t, s, N(p.flower), 17, o);
    add(
      'flower',
      K.flower,
      M.flower!,
      flowers.map((q) => ({
        ...q,
        y: q.y + 0.12,
        s: 0.9 + q.r * 0.6,
        color: tint(pick(['#ff5fa2', '#ffd23f', '#ffffff', '#ff8a3d', '#b98cff'], q.r), L),
      })),
      false,
    );
    const r = mulberry32(s.i * 13 + 5);
    if (p.buildings)
      add(
        'box',
        K.box,
        M.paint!,
        scatter(t, s, N(p.buildings), 18, { ...o, dmax: 0.62 }).map((q) => ({
          ...q,
          sx: 1.6 + r(),
          sy: 1.6 + r() * 4.5,
          sz: 1.6 + r(),
          color: tint(pick(['#ff7a90', '#ffd166', '#7c8cff', '#5ad1e8', '#f4f1ea'], r()), L),
        })),
      );
    if (p.houses) {
      const hs = scatter(t, s, N(p.houses), 20, o);
      add(
        'box',
        K.box,
        M.paint!,
        hs.map((q) => ({ ...q, sx: 1.2, sy: 1.1, sz: 1.2, color: tint('#fff6e6', L) })),
      );
      add(
        'roof',
        K.roof,
        M.paintFlat!,
        hs.map((q) => ({
          ...q,
          sx: 1.25,
          sy: 1.15,
          sz: 1.25,
          color: tint(pick(['#ff7a3d', '#e84a4a', '#3aa0e8'], q.r), L),
        })),
      );
    }
    if (p.towers) {
      const ts = scatter(t, s, N(p.towers), 21, { ...o, dmax: 0.66 });
      const hh = ts.map(() => 2.4 + r() * 3);
      add(
        'cyl',
        K.cyl,
        M.paint!,
        ts.map((q, k) => ({ ...q, sx: 1.3, sy: hh[k]!, sz: 1.3, color: tint('#f6efe2', L) })),
      );
      add(
        'cone',
        K.cone,
        M.paintFlat!,
        ts.map((q, k) => ({
          ...q,
          y: q.y + hh[k]! * scale,
          s: 1.25,
          color: tint(pick(['#ff5fa2', '#8b5cf6', '#f59e0b'], q.r), L),
        })),
      );
    }
    if (p.wall) {
      const ring = 22;
      for (let k = 0; k < ring; k++) {
        const a = (k / ring) * 6.283;
        const x = s.x + Math.cos(a) * s.rx * 0.62;
        const z = s.z + Math.sin(a) * s.rz * 0.62;
        if (avoid.some((q) => Math.hypot(q.x - x, q.z - z) < q.r)) continue;
        const y = sampleHeight(t, x, z) - 0.1;
        if (k % 5 === 0) {
          add('cyl', K.cyl, M.paint!, [{ x, y, z, sx: 1.6, sy: 3.4, sz: 1.6, color: tint('#e8e2d2', L) }]);
          add('cone', K.cone, M.paintFlat!, [{ x, y: y + 3.4 * scale, z, s: 1.3, color: tint('#2fb45a', L) }]);
        } else add('box', K.box, M.paint!, [{ x, y, z, sx: 1.2, sy: 2, sz: 3.4, ry: -a, color: tint('#e3dccb', L) }]);
      }
    }
    if (p.floatingRocks)
      for (const q of scatter(t, s, p.floatingRocks, 22, { ...o, dmax: 0.55 })) {
        const fy = (6 + r() * 4) * scale;
        add('rock', K.rock, M.rock!, [
          { x: q.x, y: q.y + fy, z: q.z, s: 2.2 + r(), sy: 1.4, ry: r() * 6, color: tint('#9aa3b5', L) },
        ]);
        add('bush', K.bush, M.leaf!, [
          { x: q.x, y: q.y + fy + 0.9 * scale, z: q.z, s: 1.8, color: tint('#58c45a', L) },
        ]);
      }
  }
  return Object.values(B).filter((b) => b.items.length);
}

/** Writes instance matrices/colours into an InstancedMesh. */
export function fillInstances(mesh: THREE.InstancedMesh, items: Instance[]) {
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  items.forEach((it, k) => {
    o.position.set(it.x, it.y, it.z);
    o.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
    const s = it.s ?? 1;
    o.scale.set((it.sx ?? 1) * s, (it.sy ?? 1) * s, (it.sz ?? 1) * s);
    o.updateMatrix();
    mesh.setMatrixAt(k, o.matrix);
    if (it.color) mesh.setColorAt(k, c.set(it.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}
