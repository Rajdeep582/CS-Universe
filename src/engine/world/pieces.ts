import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Point } from './layout';
import { mulberry32 } from './noise';
import type { Instance } from './props';

type Sampler = (x: number, z: number) => number;

/** Road ribbons that hug the terrain, plus stepping stones and edge pebbles. */
export function buildRoad(points: Point[], height: Sampler) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p.x, 0, p.z)),
    false,
    'centripetal',
  );
  const n = Math.max(80, Math.round(curve.getLength() * 3));
  const samples = curve.getSpacedPoints(n);
  const ribbon = (w: number, lift: number) => {
    const pos: number[] = [];
    const idx: number[] = [];
    samples.forEach((p, k) => {
      const t = curve.getTangentAt(k / n);
      const l = Math.hypot(t.x, t.z) || 1;
      const nx = -t.z / l;
      const nz = t.x / l;
      for (const sgn of [-1, 1]) {
        const x = p.x + sgn * nx * w;
        const z = p.z + sgn * nz * w;
        pos.push(x, height(x, z) + lift, z);
      }
      if (k) {
        const a = (k - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  const r = mulberry32(77);
  const stones: Instance[] = samples
    .filter((_, k) => k % 5 === 0)
    .map((p, k) => ({ x: p.x, y: height(p.x, p.z) + 0.17, z: p.z, s: 0.55, sy: 0.22, ry: k }));
  const pebbles: Instance[] = [];
  samples.forEach((p, k) => {
    if (k % 3) return;
    const t = curve.getTangentAt(k / n);
    const side = r() > 0.5 ? 1 : -1;
    const x = p.x - t.z * side * 3.5;
    const z = p.z + t.x * side * 3.5;
    pebbles.push({ x, y: height(x, z), z, s: 0.25 + r() * 0.3, sy: 0.6, ry: r() * 6 });
  });
  return { edge: ribbon(3.25, 0.1), surface: ribbon(2.7, 0.16), stones, pebbles, samples };
}

let PIECES: ReturnType<typeof makePieces> | null = null;
function makePieces() {
  const star = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? 0.42 : 1;
    if (k) star.lineTo(Math.cos(a) * rr, -Math.sin(a) * rr);
    else star.moveTo(Math.cos(a) * rr, -Math.sin(a) * rr);
  }
  const boatHull = new THREE.CylinderGeometry(1, 0.65, 0.9, 4, 1)
    .rotateY(Math.PI / 4)
    .scale(2.4, 1, 0.9)
    .translate(0, 0.25, 0);
  const boatWood = mergeGeometries([
    new THREE.BoxGeometry(3.1, 0.12, 1.1).translate(0, 0.72, 0),
    new THREE.CylinderGeometry(0.06, 0.07, 4.2, 6).translate(0.2, 2.8, 0),
  ])!;
  const sail = new THREE.BufferGeometry();
  sail.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [0.3, 4.6, 0, 0.3, 1.1, 0, 2.3, 1.1, 0, 0.1, 4.3, 0, 0.1, 1.3, 0, -1.5, 1.3, 0],
      3,
    ),
  );
  sail.computeVertexNormals();
  return {
    pedestalBase: new THREE.CylinderGeometry(3.1, 3.5, 1.3, 8).translate(0, 0.45, 0),
    pedestalRim: new THREE.TorusGeometry(2.7, 0.22, 8, 36).rotateX(Math.PI / 2).translate(0, 1.05, 0),
    pedestalTop: new THREE.CylinderGeometry(2.55, 2.55, 0.3, 36).translate(0, 1.08, 0),
    star: new THREE.ExtrudeGeometry(star, {
      depth: 0.25,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.1,
      bevelSegments: 2,
    }).center(),
    chestBody: new THREE.BoxGeometry(2.6, 1.5, 1.7).translate(0, 0.75, 0),
    chestLid: new THREE.CylinderGeometry(0.85, 0.85, 2.6, 16, 1, false, 0, Math.PI)
      .rotateZ(Math.PI / 2)
      .translate(0, 1.5, 0),
    chestTrim: mergeGeometries([
      new THREE.BoxGeometry(0.22, 1.56, 1.76).translate(-0.9, 0.75, 0),
      new THREE.BoxGeometry(0.22, 1.56, 1.76).translate(0.9, 0.75, 0),
      new THREE.BoxGeometry(0.45, 0.55, 0.2).translate(0, 1.25, 0.9),
    ])!,
    post: new THREE.CylinderGeometry(0.16, 0.2, 3.4, 6).translate(0, 1.7, 0),
    board: new THREE.BoxGeometry(2.6, 1.1, 0.18).translate(0, 3.1, 0),
    beam: new THREE.CylinderGeometry(1.7, 2.0, 22, 24, 1, true).translate(0, 11, 0),
    gem: new THREE.OctahedronGeometry(1.15, 0).scale(1, 1.45, 1),
    boatHull,
    boatWood,
    sail,
    buoy: new THREE.SphereGeometry(0.62, 12, 10),
    ...castleGeometry(),
  };
}
export const pieces = () => (PIECES ??= makePieces());

/** Castle merged into one geometry per material (stone, stone trim, roof, gold, dark). */
function castleGeometry() {
  const stone: THREE.BufferGeometry[] = [new THREE.BoxGeometry(9, 9, 7).translate(0, 4.5, 0)];
  const trim: THREE.BufferGeometry[] = [new THREE.BoxGeometry(14, 5, 10).translate(0, 2.5, 2)];
  const roof: THREE.BufferGeometry[] = [];
  const gold: THREE.BufferGeometry[] = [];
  const dark: THREE.BufferGeometry[] = [
    new THREE.CylinderGeometry(2, 2, 0.6, 20, 1, false, 0, Math.PI).rotateX(Math.PI / 2).translate(0, 2.4, 7.1),
    new THREE.BoxGeometry(4, 2.4, 0.6).translate(0, 1.2, 7.1),
  ];
  for (let k = 0; k < 8; k++) trim.push(new THREE.BoxGeometry(0.9, 1, 0.9).translate(-4 + k * 1.15, 9.4, 3.3));
  for (const [tx, tz, th] of [
    [-7.5, 7, 9],
    [7.5, 7, 9],
    [-7.5, -3, 11],
    [7.5, -3, 11],
    [0, -1, 15],
  ] as const) {
    stone.push(new THREE.CylinderGeometry(1.9, 2.1, th, 18).translate(tx, th / 2, tz));
    roof.push(new THREE.ConeGeometry(2.5, 4.2, 18).translate(tx, th + 2.1, tz));
    gold.push(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6).translate(tx, th + 5, tz));
    gold.push(new THREE.PlaneGeometry(1.5, 0.9).translate(tx + 0.75, th + 5.6, tz));
    for (let w = 0; w < 3; w++) {
      const a = w * 0.7 - 0.7;
      dark.push(
        new THREE.BoxGeometry(0.45, 0.9, 0.2)
          .rotateY(a)
          .translate(tx + Math.sin(a) * 2.02, th * 0.65, tz + Math.cos(a) * 2.02),
      );
    }
  }
  for (let k = 0; k < 6; k++)
    trim.push(new THREE.BoxGeometry(4.5, 0.5, 1.3).translate(-2 - k * 0.6, -0.6 - k * 0.5, 9 + k * 1.2));
  const m = (a: THREE.BufferGeometry[]) => mergeGeometries(a.map((g) => (g.index ? g.toNonIndexed() : g)))!;
  return { castleStone: m(stone), castleTrim: m(trim), castleRoof: m(roof), castleGold: m(gold), castleDark: m(dark) };
}
