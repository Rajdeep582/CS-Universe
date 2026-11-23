// CS Universe — Phase 0 design prototype renderer (throwaway; renders concept stills, NOT app code)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLDS, STAGE, TOTAL_STARS } from './data.js';

const VIEW = new URLSearchParams(location.search).get('view') || 'world';
const W = 1600, H = 900;

// ───────────────────────── noise ─────────────────────────
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const prand = mulberry(1337);
const perm = new Uint8Array(512); { const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(prand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
const G2 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
function simplex(x, y) {
  const F2 = .5 * (Math.sqrt(3) - 1), G = (3 - Math.sqrt(3)) / 6;
  const s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s), t = (i + j) * G;
  const x0 = x - (i - t), y0 = y - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
  const x1 = x0 - i1 + G, y1 = y0 - j1 + G, x2 = x0 - 1 + 2 * G, y2 = y0 - 1 + 2 * G;
  const ii = i & 255, jj = j & 255; let n = 0;
  for (const [dx, dy, gi] of [[x0, y0, perm[ii + perm[jj]]], [x1, y1, perm[ii + i1 + perm[jj + j1]]], [x2, y2, perm[ii + 1 + perm[jj + 1]]]]) {
    let tt = .5 - dx * dx - dy * dy; if (tt > 0) { tt *= tt; const g = G2[gi & 7]; n += tt * tt * (g[0] * dx + g[1] * dy); }
  }
  return 70 * n;
}
const fbm = (x, y, o = 4) => { let a = 1, f = 1, s = 0, n = 0; for (let k = 0; k < o; k++) { s += a * simplex(x * f, y * f); n += a; a *= .5; f *= 2.03; } return s / n; };
const sm = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ───────────────────────── biome palette ─────────────────────────
const BIOME = {
  palm:    { grass: ['#86d34f', '#5fb83a'], rock: '#9a8a74', peak: 0,  sand: '#f4dfa8' },
  jungle:  { grass: ['#2fae55', '#1b8744'], rock: '#6f7a5a', peak: 2,  sand: '#ecd59c' },
  crystal: { grass: ['#9fe0b6', '#76c79a'], rock: '#8c9cc0', peak: 11, snow: '#f4f8ff', sand: '#efe0b8' },
  volcano: { grass: ['#86b04a', '#5f8a37'], rock: '#4b3a36', peak: 12, sand: '#d9c08e', basalt: '#3a2c2a' },
  pine:    { grass: ['#78bf68', '#4f9a52'], rock: '#7f7a8e', peak: 2,  sand: '#efdcaa' },
  snow:    { grass: ['#eef6ff', '#d6e6f6'], rock: '#8aa1bd', peak: 10, snow: '#ffffff', sand: '#e9e4d6' },
  city:    { grass: ['#97d39a', '#73b979'], rock: '#8b8f96', peak: 0,  sand: '#efdcaa' },
  tower:   { grass: ['#bfe38a', '#99c966'], rock: '#9b8f84', peak: 1,  sand: '#f1deae' },
  house:   { grass: ['#b9e46a', '#93c84a'], rock: '#9a8f7a', peak: 0,  sand: '#f3dfab' },
  cloud:   { grass: ['#9fd88a', '#77bf6a'], rock: '#8c97ad', peak: 1,  sand: '#efdcaa' },
  wall:    { grass: ['#7fcb7f', '#5aa860'], rock: '#8d8a80', peak: 1,  sand: '#efdcaa' },
};
const C = (h) => new THREE.Color(h);
const grey = C('#b7c1cf');
function lockTint(col, locked) { if (!locked) return col; const g = col.clone(); const l = (g.r + g.g + g.b) / 3; g.setRGB(l, l, l).lerp(grey, .45); return col.clone().lerp(g, .62).multiplyScalar(.98); }

// ───────────────────────── renderer / scene ─────────────────────────
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const FOG = C('#bfeaff'); scene.fog = new THREE.Fog(FOG, 330, 720); scene.background = FOG;
const camera = new THREE.PerspectiveCamera(34, W / H, 1, 1500);

scene.add(new THREE.HemisphereLight('#d8f3ff', '#5a7a46', 1.15));
const sun = new THREE.DirectionalLight('#fff1d6', 2.9);
sun.position.set(-90, 140, 70); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.35;
Object.assign(sun.shadow.camera, { left: -200, right: 200, top: 140, bottom: -140, near: 10, far: 450 });
scene.add(sun);
const SUNDIR = sun.position.clone().normalize();

// ───────────────────────── terrain field ─────────────────────────
let ISL = [];   // {x,z,R,rx,rz,kind,locked,peak:{x,z,h}, i}
let BOUNDS = { x0: -190, x1: 190, z0: -120, z1: 120 };
function heightAt(x, z) {
  let best = -6, bi = -1, bd = 9;
  const warp = fbm(x * .045 + 11, z * .045 - 7, 3) * .2;
  for (const s of ISL) {
    const dx = (x - s.x) / s.rx, dz = (z - s.z) / s.rz;
    const d = Math.hypot(dx, dz) / (1 + warp + fbm(x * .02 + s.i * 3.1, z * .02, 2) * .1);
    if (d > 1.45) continue;
    let h = -6 + 5.4 * sm(1.38, 1.0, d) + 1.05 * sm(1.0, .86, d);
    h += sm(.9, .62, d) * (1.25 + fbm(x * .11 + s.i, z * .11, 4) * .95);
    if (s.peak) {
      const pd = Math.hypot(x - s.peak.x, z - s.peak.z) / (s.R * .55);
      const pk = Math.pow(Math.max(0, 1 - pd), 1.55) * s.peak.h * (.86 + .28 * fbm(x * .2, z * .2, 3));
      h += pk;
      if (s.kind === 'volcano') h -= Math.pow(Math.max(0, 1 - pd / .16), 2) * 3.2;
    }
    if (s.bumps) for (const b of s.bumps) { const bd2 = Math.hypot(x - b.x, z - b.z) / b.r; h += b.h * Math.pow(Math.max(0, 1 - bd2), 2) * (b.h < 0 ? 1 : (.9 + .2 * fbm(x * .3, z * .3, 2))); }
    h += fbm(x * .55, z * .55, 2) * .08 * sm(1.0, .8, d);
    if (h > best) { best = h; bi = s.i; bd = d; }
  }
  return { h: best, i: bi, d: bd };
}
const hOnly = (x, z) => heightAt(x, z).h;

function buildTerrain(segX, segZ) {
  const w = BOUNDS.x1 - BOUNDS.x0, d = BOUNDS.z1 - BOUNDS.z0;
  const geo = new THREE.PlaneGeometry(w, d, segX, segZ); geo.rotateX(-Math.PI / 2);
  geo.translate((BOUNDS.x0 + BOUNDS.x1) / 2, 0, (BOUNDS.z0 + BOUNDS.z1) / 2);
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k);
    const r = heightAt(x, z); const h = r.h; pos.setY(k, h);
    const s = r.i >= 0 ? ISL.find(q => q.i === r.i) : null;
    const B = s ? BIOME[s.kind] : BIOME.palm;
    const hx = hOnly(x + .6, z) - hOnly(x - .6, z), hz = hOnly(x, z + .6) - hOnly(x, z - .6);
    const slope = Math.hypot(hx, hz) / 1.2;
    const n = fbm(x * .18, z * .18, 3), n2 = fbm(x * .9 + 5, z * .9, 2);
    if (h < -.15) c.set(B.sand).multiplyScalar(lerp(.92, .62, sm(-.15, -3.5, h)));
    else if (h < .62) c.set(B.sand).offsetHSL(0, 0, n2 * .03);
    else {
      c.set(B.grass[0]).lerp(C(B.grass[1]), sm(-.3, .45, n));
      c.offsetHSL(n2 * .012, 0, n2 * .035);
      if (h < .85) c.lerp(C(B.sand), sm(.85, .62, h));
      if (slope > .42) c.lerp(C(B.rock), sm(.42, .9, slope));
      if (s && s.peak && h > 4.2) {
        if (B.snow) c.lerp(C(B.snow), sm(5.2, 7.5, h + n * 1.5));
        if (B.basalt) c.lerp(C(B.basalt), sm(3.5, 6, h));
      }
    }
    if (s) { const t = lockTint(c, s.locked); c.copy(t); }
    cols.set([c.r, c.g, c.b], k * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .93, metalness: 0 }));
  m.receiveShadow = true; m.castShadow = true; scene.add(m);
  return m;
}

function buildWater() {
  const TW = 512, TH = 330, data = new Uint8Array(TW * TH);
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const x = lerp(BOUNDS.x0, BOUNDS.x1, i / (TW - 1)), z = lerp(BOUNDS.z0, BOUNDS.z1, j / (TH - 1));
    data[j * TW + i] = Math.round(Math.min(1, Math.max(0, (hOnly(x, z) + 6) / 8)) * 255);
  }
  const tex = new THREE.DataTexture(data, TW, TH, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  const mat = new THREE.ShaderMaterial({
    uniforms: { hmap: { value: tex }, bmin: { value: new THREE.Vector2(BOUNDS.x0, BOUNDS.z0) }, bsize: { value: new THREE.Vector2(BOUNDS.x1 - BOUNDS.x0, BOUNDS.z1 - BOUNDS.z0) },
      sunDir: { value: SUNDIR }, fogC: { value: FOG }, fogN: { value: 330 }, fogF: { value: 720 }, t: { value: 3.7 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `
      uniform sampler2D hmap; uniform vec2 bmin, bsize; uniform vec3 sunDir, fogC; uniform float fogN, fogF, t; varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
      float wav(vec2 p){ return vn(p+vec2(t*.3,t*.2))*.5 + vn(p*2.1-vec2(t*.25,-t*.1))*.3 + vn(p*4.3+t*.4)*.2; }
      void main(){
        vec2 uv=(vW.xz-bmin)/bsize; float h=texture2D(hmap,uv).r*8.-6.;
        float depth=clamp(-h/5.5,0.,1.);
        vec3 shallow=vec3(.36,.93,.90), mid=vec3(.07,.66,.90), deep=vec3(.02,.36,.70);
        vec3 col=mix(shallow,mid,smoothstep(.02,.32,depth)); col=mix(col,deep,smoothstep(.35,1.,depth));
        vec2 p=vW.xz*.32; float w0=wav(p), wx=wav(p+vec2(.08,0.)), wz=wav(p+vec2(0.,.08));
        vec3 N=normalize(vec3((w0-wx)*3.2,1.,(w0-wz)*3.2));
        vec3 V=normalize(cameraPosition-vW);
        float caus=pow(abs(sin(wav(vW.xz*.55)*9.)),6.);
        col+= (1.-smoothstep(0.,.35,depth))*caus*.10;
        float shore=smoothstep(-1.25,-.05,h);
        float band=.5+.5*sin(h*10.+w0*7.);
        float foam=shore*smoothstep(.35,.9,band)*.75 + smoothstep(-.35,-.02,h)*.9;
        col=mix(col,vec3(1.),clamp(foam,0.,1.)*.85);
        float fres=pow(1.-max(dot(N,V),0.),4.);
        col=mix(col,vec3(.80,.94,1.),fres*.45);
        vec3 R=reflect(-sunDir,N); col+=vec3(1.,.95,.85)*pow(max(dot(R,V),0.),160.)*1.1;
        col+=vec3(.9,1.,1.)*smoothstep(.72,.98,w0)*.05;
        float dist=length(cameraPosition-vW); col=mix(col,fogC,smoothstep(fogN,fogF,dist));
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const g = new THREE.PlaneGeometry(BOUNDS.x1 - BOUNDS.x0 + 900, BOUNDS.z1 - BOUNDS.z0 + 900, 1, 1); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.position.y = 0; scene.add(m);
}

// ───────────────────────── geometry kit ─────────────────────────
let DSCALE = 1;
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, ...o });
function inst(geo, mat, list, { shadow = true, color } = {}) {
  if (!list.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, list.length); const d = new THREE.Object3D();
  list.forEach((it, k) => { d.position.set(it.x, it.y, it.z); d.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0); d.scale.setScalar(DSCALE); if (it.s) d.scale.set((it.sx ?? it.s) * DSCALE, (it.sy ?? it.s) * DSCALE, (it.sz ?? it.s) * DSCALE); d.updateMatrix(); m.setMatrixAt(k, d.matrix); if (color) m.setColorAt(k, color(it)); });
  m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m;
}
const G = {};
G.trunk = new THREE.CylinderGeometry(.13, .2, 1, 6).translate(0, .5, 0);
G.canopy = mergeGeometries([new THREE.IcosahedronGeometry(.78, 1).scale(1, .9, 1).translate(0, 1.45, 0), new THREE.IcosahedronGeometry(.52, 1).translate(.45, 1.15, .2), new THREE.IcosahedronGeometry(.5, 1).translate(-.42, 1.2, -.18)]);
G.pine = mergeGeometries([new THREE.ConeGeometry(.85, 1.3, 7).translate(0, 1.05, 0), new THREE.ConeGeometry(.66, 1.1, 7).translate(0, 1.65, 0), new THREE.ConeGeometry(.45, .9, 7).translate(0, 2.2, 0)]);
{ // palm trunk (curved, segmented) + fronds
  const segs = []; for (let k = 0; k < 7; k++) { const y = k * .42, bend = .025 * k * k; segs.push(new THREE.CylinderGeometry(.11 - k * .006, .14 - k * .006, .44, 6).rotateZ(-.08 * k).translate(bend, y + .22, 0)); }
  G.palmTrunk = mergeGeometries(segs);
  const fr = []; for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; const f = new THREE.ConeGeometry(.17, 1.7, 4).rotateZ(Math.PI / 2 + .55).translate(.85, -.25, 0).rotateY(a); fr.push(f); }
  fr.push(new THREE.SphereGeometry(.2, 8, 6).translate(.1, -.15, 0));
  G.palmTop = mergeGeometries(fr).translate(.95, 3.0, 0);
}
G.rock = new THREE.DodecahedronGeometry(.6, 0);
G.crystal = new THREE.OctahedronGeometry(.45, 0).scale(.55, 1.9, .55).translate(0, .75, 0);
G.box = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);
G.roof = new THREE.CylinderGeometry(.62, .62, 1.18, 3).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).scale(1, .55, 1).translate(0, 1.18, 0);
G.cyl = new THREE.CylinderGeometry(.5, .55, 1, 14).translate(0, .5, 0);
G.cone = new THREE.ConeGeometry(.68, 1.1, 14).translate(0, .55, 0);
G.flower = new THREE.SphereGeometry(.12, 6, 5);
G.bush = mergeGeometries([new THREE.IcosahedronGeometry(.45, 1).translate(0, .3, 0), new THREE.IcosahedronGeometry(.34, 1).translate(.35, .22, .1), new THREE.IcosahedronGeometry(.3, 1).translate(-.3, .2, -.1)]);
G.puff = mergeGeometries([new THREE.SphereGeometry(3, 14, 10), new THREE.SphereGeometry(2.4, 14, 10).translate(2.8, -.5, .5), new THREE.SphereGeometry(2.2, 14, 10).translate(-2.7, -.6, -.3), new THREE.SphereGeometry(1.8, 12, 8).translate(1.2, 1.6, -.6), new THREE.SphereGeometry(1.6, 12, 8).translate(-4.6, -1, .4)]).scale(1, .62, 1);

function scatter(s, n, { dmin = 0, dmax = .78, hmin = .8, slopeMax = .38, avoid = [], seed = 1, spread = 1 } = {}) {
  const r = mulberry(seed + s.i * 97), out = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 40) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(lerp(dmin * dmin, dmax * dmax, r())) * spread;
    const x = s.x + Math.cos(a) * rr * s.rx, z = s.z + Math.sin(a) * rr * s.rz;
    const h = hOnly(x, z); if (h < hmin) continue;
    const sl = Math.hypot(hOnly(x + .5, z) - hOnly(x - .5, z), hOnly(x, z + .5) - hOnly(x, z - .5));
    if (sl > slopeMax) continue;
    if (avoid.some(p => Math.hypot(p.x - x, p.z - z) < p.r)) continue;
    out.push({ x, y: h - .05, z, r: r(), ry: r() * 6.28 });
  }
  return out;
}

function decorate(s, avoid = []) {
  const L = s.locked, tint = (h) => lockTint(C(h), L);
  const trees = [], pines = [], palms = [], rocks = [], crystals = [], boxes = [], roofs = [], cyls = [], cones = [], flowers = [], bushes = [];
  const k = s.kind, dens = s.density || 1;
  const N = (v) => Math.round(v * dens);
  if (k === 'palm') { palms.push(...scatter(s, N(14), { dmin: .35, dmax: .92, hmin: .45, avoid, seed: 3 })); bushes.push(...scatter(s, N(16), { avoid, seed: 4 })); }
  if (k === 'jungle') { trees.push(...scatter(s, N(46), { avoid, seed: 5, slopeMax: .6 })); palms.push(...scatter(s, N(6), { dmin: .75, dmax: .95, hmin: .45, avoid, seed: 6 })); bushes.push(...scatter(s, N(14), { avoid, seed: 9 })); }
  if (k === 'pine') { pines.push(...scatter(s, N(48), { avoid, seed: 7, slopeMax: .6 })); }
  if (k === 'snow') { pines.push(...scatter(s, N(20), { dmax: .85, avoid, seed: 8, slopeMax: .7 })); }
  if (k === 'crystal') { crystals.push(...scatter(s, N(30), { avoid, seed: 10, slopeMax: .9, hmin: 1 })); trees.push(...scatter(s, N(12), { avoid, seed: 11, dmin: .5 })); }
  if (k === 'volcano') { rocks.push(...scatter(s, N(18), { avoid, seed: 12, slopeMax: .9 })); trees.push(...scatter(s, N(10), { avoid, seed: 13, dmin: .62 })); }
  if (['city', 'tower', 'house', 'wall', 'cloud'].includes(k)) { trees.push(...scatter(s, N(16), { avoid, seed: 14, dmin: .45 })); bushes.push(...scatter(s, N(10), { avoid, seed: 15 })); }
  rocks.push(...scatter(s, N(10), { dmin: .8, dmax: 1.0, hmin: -.3, slopeMax: 2, avoid, seed: 16 }));
  flowers.push(...scatter(s, N(70), { avoid, seed: 17 }));
  const r = mulberry(s.i * 13 + 5);
  if (k === 'city') {
    for (const p of scatter(s, N(22), { avoid, seed: 18, dmax: .62 })) { const hgt = 1.6 + r() * 4.5; boxes.push({ ...p, sx: 1.6 + r(), sy: hgt, sz: 1.6 + r(), s: 1, c: ['#ff7a90', '#ffd166', '#7c8cff', '#5ad1e8', '#f4f1ea'][Math.floor(r() * 5)] }); }
    const lh = scatter(s, 1, { dmin: .7, dmax: .8, seed: 19, avoid }); for (const p of lh) { cyls.push({ ...p, sx: 1.1, sy: 6, sz: 1.1, s: 1, c: '#ffffff' }); cones.push({ ...p, y: p.y + 6, s: 1.2, c: '#e63946' }); }
  }
  if (k === 'house') for (const p of scatter(s, N(14), { avoid, seed: 20 })) { const sc = .9 + r() * .5; boxes.push({ ...p, s: 1, sx: 1.2 * sc, sy: 1.1 * sc, sz: 1.2 * sc, c: '#fff6e6' }); roofs.push({ ...p, s: 1, sx: 1.25 * sc, sy: 1.15 * sc, sz: 1.25 * sc, c: ['#ff7a3d', '#e84a4a', '#3aa0e8'][Math.floor(r() * 3)] }); }
  if (k === 'tower') for (const p of scatter(s, N(10), { avoid, seed: 21, dmax: .66 })) { const hh = 2.4 + r() * 3; cyls.push({ ...p, s: 1, sx: 1.3, sy: hh, sz: 1.3, c: '#f6efe2' }); cones.push({ ...p, y: p.y + hh, s: 1.25, c: ['#ff5fa2', '#8b5cf6', '#f59e0b'][Math.floor(r() * 3)] }); }
  if (k === 'wall') { const ring = 22; for (let q = 0; q < ring; q++) { const a = q / ring * 6.283, x = s.x + Math.cos(a) * s.rx * .62, z = s.z + Math.sin(a) * s.rz * .62, y = hOnly(x, z) - .1; if (q % 5 === 0) { cyls.push({ x, y, z, s: 1, sx: 1.6, sy: 3.4, sz: 1.6, c: '#e8e2d2' }); cones.push({ x, y: y + 3.4, z, s: 1.3, c: '#2fb45a' }); } else boxes.push({ x, y, z, s: 1, sx: 1.2, sy: 2, sz: 3.4, ry: -a, c: '#e3dccb' }); } }
  if (k === 'cloud') { for (const p of scatter(s, 5, { avoid, seed: 22, dmax: .55 })) { const fy = 6 + r() * 4; rocks.push({ x: p.x, y: p.y + fy, z: p.z, s: 2.2 + r(), sy: 1.4, ry: r() * 6, c: '#9aa3b5' }); bushes.push({ x: p.x, y: p.y + fy + .9, z: p.z, s: 1.8 }); } }
  // materials
  inst(G.trunk, std(tint('#8a5a34')), [...trees].map(t => ({ ...t, s: .85 + t.r * .7 })));
  inst(G.canopy, std('#ffffff', { roughness: .75, flatShading: true }), trees.map(t => ({ ...t, s: .85 + t.r * .7 })), { color: (t) => tint(s.kind === 'jungle' ? ['#1f9e4a', '#2fbf5f', '#178a3e', '#56c95a'][Math.floor(t.r * 4)] : s.kind === 'crystal' ? '#5fbf82' : ['#4caf50', '#66bb5a', '#3d9a46'][Math.floor(t.r * 3)]) });
  inst(G.trunk, std(tint('#6b4a2e')), pines.map(t => ({ ...t, s: .5 + t.r * .25, sy: .6 })));
  inst(G.pine, std('#ffffff', { flatShading: true, roughness: .8 }), pines.map(t => ({ ...t, s: .8 + t.r * .7 })), { color: (t) => tint(s.kind === 'snow' ? (t.r > .5 ? '#3f7f8f' : '#5a9aa6') : ['#7c4dd6', '#5d3cc4', '#3f8f5a', '#9a6bf0'][Math.floor(t.r * 4)]) });
  inst(G.palmTrunk, std(tint('#a9763e'), { flatShading: true }), palms.map(t => ({ ...t, s: .9 + t.r * .5 })));
  inst(G.palmTop, std('#ffffff', { flatShading: true, roughness: .7, side: THREE.DoubleSide }), palms.map(t => ({ ...t, s: .9 + t.r * .5 })), { color: (t) => tint(t.r > .5 ? '#2fae4f' : '#3fbf57') });
  inst(G.rock, std('#ffffff', { flatShading: true, roughness: .95 }), rocks.map(t => ({ ...t, s: t.s ?? (.5 + t.r * 1.1), sy: t.sy ?? (.55 + t.r * .4), ry: t.ry })), { color: (t) => tint(t.c || BIOME[s.kind].rock) });
  inst(G.crystal, std('#ffffff', { flatShading: true, roughness: .18, metalness: .15, emissive: '#3b1a7a', emissiveIntensity: .25 }), crystals.map(t => ({ ...t, s: .8 + t.r * 1.6, rz: (t.r - .5) * .5 })), { color: (t) => tint(s.i === 11 || s.kind === 'crystal' && s.neon ? ['#46f0ff', '#ff5cf2', '#8b5cf6'][Math.floor(t.r * 3)] : ['#b98cff', '#8fb8ff', '#d6b8ff'][Math.floor(t.r * 3)]) });
  inst(G.box, std('#ffffff', { roughness: .7 }), boxes, { color: (t) => tint(t.c) });
  inst(G.roof, std('#ffffff', { flatShading: true }), roofs, { color: (t) => tint(t.c) });
  inst(G.cyl, std('#ffffff', { roughness: .7 }), cyls, { color: (t) => tint(t.c) });
  inst(G.cone, std('#ffffff', { flatShading: true }), cones, { color: (t) => tint(t.c) });
  inst(G.bush, std('#ffffff', { flatShading: true }), bushes.map(t => ({ ...t, s: t.s ?? (.8 + t.r * .7) })), { color: (t) => tint(['#3fae4f', '#58c45a', '#2f9a48'][Math.floor((t.r ?? .3) * 3)]) });
  inst(G.flower, std('#ffffff', { roughness: .6 }), flowers.map(t => ({ ...t, y: t.y + .12, s: .9 + t.r * .6 })), { shadow: false, color: (t) => tint(['#ff5fa2', '#ffd23f', '#ffffff', '#ff8a3d', '#b98cff'][Math.floor(t.r * 5)]) });
  if (k === 'volcano' && s.peak) { // lava + smoke
    const lava = new THREE.Mesh(new THREE.CircleGeometry(1.7, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ff5a1f', emissive: '#ff3d00', emissiveIntensity: L ? .2 : 2.2 }));
    lava.position.set(s.peak.x, hOnly(s.peak.x, s.peak.z) + .25, s.peak.z); scene.add(lava);
    const sm = new THREE.MeshStandardMaterial({ color: '#e9e6ef', transparent: true, opacity: .78, roughness: 1 });
    for (let q = 0; q < 6; q++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + q * .45, 2), sm); p.position.set(s.peak.x + q * 1.2 + Math.sin(q) * .8, lava.position.y + 2 + q * 1.9, s.peak.z - q * .9); p.castShadow = true; scene.add(p); }
  }
}

function cloudsAt(list) { inst(G.puff, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: .93 }), list); }
function mist(x, y, z, s) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(240,246,255,.9)'); rg.addColorStop(.5, 'rgba(235,242,252,.45)'); rg.addColorStop(1, 'rgba(235,242,252,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: .55 })); sp.position.set(x, y, z); sp.scale.set(s, s * .45, 1); scene.add(sp);
}
function boat(x, z, ry, sc = 1, colHull = '#ef4444') {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1, .65, .9, 4, 1).rotateY(Math.PI / 4).scale(2.4, 1, .9), std(colHull, { roughness: .5 })); hull.position.y = .25; g.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.1, .12, 1.1), std('#c08a54')); deck.position.y = .72; g.add(deck);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, 4.2, 6), std('#7a5230')); mast.position.set(.2, 2.8, 0); g.add(mast);
  const sailG = new THREE.BufferGeometry(); sailG.setAttribute('position', new THREE.Float32BufferAttribute([.3, 4.6, 0, .3, 1.1, 0, 2.3, 1.1, 0, .1, 4.3, 0, .1, 1.3, 0, -1.5, 1.3, 0], 3)); sailG.computeVertexNormals();
  const sail = new THREE.Mesh(sailG, std('#fffaf0', { side: THREE.DoubleSide, roughness: .6 })); g.add(sail);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(.7, .4), std('#ffc23f', { side: THREE.DoubleSide })); flag.position.set(.55, 4.75, 0); g.add(flag);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(sc); scene.add(g);
  const wake = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.6, 40, 1, 0, Math.PI).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .55 }));
  wake.position.set(x, .05, z); wake.rotation.y = ry + Math.PI / 2; wake.scale.set(sc * 1.4, 1, sc); scene.add(wake);
  return g;
}

// ───────────────────────── HTML helpers ─────────────────────────
const ICONS = {}; async function loadIcons(names) { await Promise.all(names.map(async n => { ICONS[n] = (await (await fetch(`./node_modules/lucide-static/icons/${n}.svg`)).text()).replace('<svg', '<svg class="i"'); })); }
const ic = (n) => ICONS[n] || '';
const starSvg = (on, id = Math.random().toString(36).slice(2)) => `<svg viewBox="0 0 48 48"><defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${on ? '#fff6b0' : '#e6ebf3'}"/><stop offset=".5" stop-color="${on ? '#ffc61a' : '#c5cfdf'}"/><stop offset="1" stop-color="${on ? '#f08a00' : '#a3b0c4'}"/></linearGradient></defs><path d="M24 3.5l6.2 12.6 13.9 2-10 9.8 2.4 13.8L24 35.2 11.5 41.7l2.4-13.8-10-9.8 13.9-2z" fill="url(#g${id})" stroke="${on ? '#b45309' : '#8c99ae'}" stroke-width="2.4" stroke-linejoin="round"/><path d="M24 9l4.3 8.6 9.5 1.4" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.2" stroke-linecap="round"/></svg>`;
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
const project = (v) => { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; };

function hudCommon() {
  const xp = 27350, base = 26000, next = 36000; const frac = (xp - base) / (next - base);
  const hud = document.getElementById('hud');
  hud.append(el(`<div class="profile glass"><div class="avatar" style="background:conic-gradient(from -90deg,#22d3ee 0 ${frac * 100}%,rgba(11,36,71,.12) ${frac * 100}% 100%)"><div class="face">RB</div><div class="lv">10</div></div>
    <div class="pmeta"><div class="prow"><div class="rank display">PROTOCOL<small>Rank 10 of 16</small></div><div class="xpnum">${xp.toLocaleString()} XP</div></div>
    <div class="xpbar"><i style="width:${frac * 100}%"></i><b></b></div><div class="xpsub">${(next - xp).toLocaleString()} XP to <b style="color:#0b2447">Compiler</b> · 76 levels mastered</div></div></div>`));
  hud.append(el(`<div class="chips"><div class="chip glass"><div class="ico gold">${ic('star')}</div><div><div class="v display">246<span style="font-size:14px;color:#5d7598"> / ${TOTAL_STARS.toLocaleString()}</span></div><div class="l">STARS EARNED</div></div></div>
    <div class="chip glass"><div class="ico fire">${ic('flame')}</div><div><div class="v display">12</div><div class="l">DAY STREAK</div></div></div>
    <div class="chip glass"><div class="ico ice">${ic('snowflake')}</div><div><div class="v display">2</div><div class="l">FREEZES</div></div></div></div>`));
  hud.append(el(`<div class="tools"><div class="search glass">${ic('search')} Search any topic <span class="k">Ctrl K</span></div>
    <div class="tbtn glass">${ic('trophy')}<span class="badge">3</span></div><div class="tbtn glass">${ic('book-open')}</div><div class="tbtn glass">${ic('settings')}</div></div>`));
}

// ───────────────────────── WORLD VIEW ─────────────────────────
async function worldView() {
  const THUMB = new URLSearchParams(location.search).get('island');
  const xs = [-114, -38, 38, 114], zs = [-70, 0, 70];
  ISL = WORLDS.map((w, i) => {
    const row = Math.floor(i / 4); let c = i % 4; if (row === 1) c = 3 - c;
    const x = xs[c] + (row === 1 ? 6 : 0) + (i % 2 ? 3 : -3), z = zs[row] + (c % 2 ? 6 : -4);
    const R = i === 2 ? 25 : 22.5, rx = R * 1.2, rz = R * .82;
    const B = BIOME[w.kind];
    const peak = B.peak ? { x: x + (i % 2 ? 4 : -5), z: z - 3, h: B.peak } : null;
    return { ...w, i, x, z, R, rx, rz, peak, neon: w.id === 'intelligence', density: 1, locked: THUMB !== null ? false : w.locked };
  });
  BOUNDS = { x0: -250, x1: 250, z0: -140, z1: 150 };
  camera.position.set(0, 232, 178); camera.lookAt(0, 0, -2); camera.updateMatrixWorld();
  if (THUMB !== null) { const t = ISL[+THUMB]; camera.fov = 30; camera.aspect = W / H; camera.updateProjectionMatrix(); camera.position.set(t.x + 6, 58, t.z + 62); camera.lookAt(t.x, 1.5, t.z + 2); camera.updateMatrixWorld(); }
  buildTerrain(560, 330); buildWater();
  DSCALE = 1.1; for (const s of ISL) decorate(s); DSCALE = 1;
  // route (buoys)
  const pts = ISL.map(s => new THREE.Vector3(s.x, .3, s.z + s.rz * .2));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', .5);
  const buoys = [], N = 420; for (let k = 0; k <= N; k++) { const p = curve.getPoint(k / N); if (hOnly(p.x, p.z) > -.4) continue; buoys.push({ x: p.x, y: .25, z: p.z, s: 1, done: k / N < 2 / 11 + .02 }); }
  inst(new THREE.SphereGeometry(.62, 12, 10), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: .5, roughness: .25 }), buoys.filter((_, k) => k % 3 === 0), { shadow: false, color: (b) => C(b.done ? '#ffc61a' : '#ffffff') });
  // boat near current island (World 3)
  const cur = ISL[2]; boat(cur.x + cur.rx * 1.05, cur.z + 10, -.5, 2.1);
  for (const [bx, bz, r, c] of [[-160, 36, .8, '#3b82f6'], [160, 36, 2.1, '#10b981'], [0, 38, 1.2, '#f59e0b'], [0, -36, .3, '#8b5cf6']]) boat(bx, bz, r, 1.3, c);
  cloudsAt([{ x: -178, y: 34, z: -100, s: 2.3 }, { x: 182, y: 30, z: 30, s: 2.1 }, { x: 70, y: 46, z: -125, s: 1.7 }, { x: -190, y: 30, z: 60, s: 1.6 }]);
  for (const s of ISL.filter(s => s.locked)) { mist(s.x - 8, 6, s.z + 2, 30); }
  renderer.render(scene, camera);
  if (THUMB !== null) { document.getElementById('fx').style.display = 'none'; return; }
  // labels
  await loadIcons(['star', 'flame', 'snowflake', 'search', 'trophy', 'book-open', 'settings', 'lock', 'check', 'play', 'map', 'target', 'repeat', 'zap', 'sparkles', 'chevron-left', 'clock', 'sword']);
  const lab = document.getElementById('labels');
  for (const s of ISL) {
    const p = project(new THREE.Vector3(s.x, 0, s.z + s.rz * 1.05));
    const pct = s.tot ? s.got / s.tot * 100 : 0;
    const wn = `<span class="wn" style="background:linear-gradient(180deg,${s.accent === '#FFFFFF' ? '#9fb0ff' : s.accent},${s.grassDark})">WORLD ${s.n}</span>`;
    const node = s.locked
      ? el(`<div class="isl glass locked" style="left:${p.x}px;top:${p.y - 6}px"><div class="top">${wn}<span class="dom">${s.domain}</span></div><div class="nm">${s.name}</div><div class="lk">${ic('lock')} Locked · ${s.levels} levels</div></div>`)
      : el(`<div class="isl glass ${s.i === 2 ? 'current' : ''}" style="left:${p.x}px;top:${p.y - 6}px"><div class="top">${wn}<span class="dom">${s.domain}</span></div><div class="nm">${s.name}</div>
          <div class="pr"><div class="bar"><i style="width:${pct}%"></i></div><div class="sc">${ic('star')}${s.got}/${s.tot}</div></div>${s.got === s.tot ? `<div class="done">${ic('check')}</div>` : ''}</div>`);
    if (p.y < 690) lab.append(node);
  }
  const bp = project(new THREE.Vector3(ISL[2].x + ISL[2].rx * 1.05, 11, ISL[2].z + 10));
  lab.append(el(`<div class="pin" style="left:${bp.x}px;top:${bp.y}px"><div class="tag">YOU ARE HERE</div><div class="stem"></div></div>`));
  hudCommon();
  const hud = document.getElementById('hud');
  hud.append(el(`<div class="quests glass"><div class="qh">TODAY'S GOALS <span>resets 00:00</span></div>
    <div class="q"><div class="ring" style="--p:67;--c:#16d27f">${ic('target')}</div><div><div class="t">Clear 3 levels</div><div class="s">2 of 3</div></div><div class="r">+60</div></div>
    <div class="q"><div class="ring" style="--p:40;--c:#22b6f2">${ic('repeat')}</div><div><div class="t">Review 5 mastered levels</div><div class="s">2 of 5 due today</div></div><div class="r">+50</div></div>
    <div class="q"><div class="ring" style="--p:100;--c:#f59e0b">${ic('zap')}</div><div><div class="t">Reach a simulation goal</div><div class="s">Complete</div></div><div class="r">${ic('check')}</div></div></div>`));
  const seg = WORLDS.map(w => `<i style="background:${w.locked ? '#d3dbe7' : `linear-gradient(180deg,${w.accent === '#FFFFFF' ? '#9fb0ff' : w.accent},${w.grassDark})`};opacity:${w.locked ? 1 : .35 + .65 * (w.got / w.tot)}"></i>`).join('');
  hud.append(el(`<div class="summary glass"><div class="h">ATLAS <span>13.1% explored · 6 / 12 worlds open</span></div><div class="meter">${seg}</div>
    <div class="legend"><span><b style="background:#ffc61a"></b>1★ Cleared</span><span><b style="background:#f59e0b"></b>2★ Excellent</span><span><b style="background:#b45309"></b>3★ Mastered</span></div></div>`));
  hud.append(el(`<div class="cta glass"><div class="next"><div class="thumb">3·4</div><div><div class="a">Next on your path · World 3</div><div class="b">Graphs, Vertices, Edges & Degree</div></div></div><div class="play">${ic('play')}CONTINUE</div></div>`));
}

// ───────────────────────── STAGE VIEW ─────────────────────────
async function stageView(clear = false) {
  const castle = { x: 62, z: -30 };
  ISL = [{ i: 0, x: 0, z: 0, R: 70, rx: 92, rz: 56, kind: 'palm', locked: false, peak: null, density: 0,
    bumps: [{ x: castle.x, z: castle.z, r: 22, h: 3.2 }, { x: -60, z: -34, r: 18, h: 4.2 }, { x: -30, z: 30, r: 9, h: -2.4 }, { x: 20, z: -38, r: 16, h: 1.4 }] }];
  BOUNDS = { x0: -150, x1: 150, z0: -100, z1: 100 };
  camera.fov = 36; camera.updateProjectionMatrix();
  camera.position.set(2, 122, 128); camera.lookAt(2, 0, -2); camera.updateMatrixWorld();
  const lv = STAGE.levels;
  const L = lv.map((l, i) => ({ ...l, x: -70 + i * 15.6, z: 20 - 15 * Math.sin(i * .95) - (i % 2) * 3 }));
  const ctrl = [new THREE.Vector3(-84, 0, 40), ...L.map(l => new THREE.Vector3(l.x, 0, l.z)), new THREE.Vector3(L[8].x + 8, 0, L[8].z - 12), new THREE.Vector3(castle.x - 4, 0, castle.z + 12)];
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  const samples = curve.getSpacedPoints(600);
  const avoid = [...samples.filter((_, k) => k % 4 === 0).map(p => ({ x: p.x, z: p.z, r: 4.2 })), { x: castle.x, z: castle.z, r: 13 }];
  buildTerrain(420, 280); buildWater();
  // path ribbons
  const ribbon = (w, lift, color) => {
    const pos = [], idx = [];
    samples.forEach((p, k) => { const t = curve.getTangentAt(k / (samples.length - 1)); const nx = -t.z, nz = t.x, l = Math.hypot(nx, nz) || 1;
      for (const sgn of [-1, 1]) { const x = p.x + sgn * nx / l * w, z = p.z + sgn * nz / l * w; pos.push(x, hOnly(x, z) + lift, z); }
      if (k) { const a = (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, std(color, { roughness: .95, polygonOffset: true, polygonOffsetFactor: -2 })); m.receiveShadow = true; scene.add(m);
  };
  ribbon(3.25, .10, '#c89a5c'); ribbon(2.7, .16, '#f2dcae');
  const stones = samples.filter((_, k) => k % 5 === 0).map((p, k) => ({ x: p.x, y: hOnly(p.x, p.z) + .17, z: p.z, s: .55, sy: .12, ry: k }));
  inst(new THREE.CylinderGeometry(1, 1, 1, 7), std('#e6cf9c', { roughness: .9 }), stones, { shadow: false });
  const edgeR = mulberry(77); const peb = []; samples.forEach((p, k) => { if (k % 3) return; const t = curve.getTangentAt(k / 600); const side = edgeR() > .5 ? 1 : -1; const x = p.x - t.z * side * 3.5, z = p.z + t.x * side * 3.5; peb.push({ x, y: hOnly(x, z), z, s: .25 + edgeR() * .3, sy: .6, ry: edgeR() * 6 }); });
  inst(G.rock, std('#cbbfa7', { flatShading: true }), peb);
  // decor
  const S0 = ISL[0];
  const r = mulberry(5);
  const palms = scatter(S0, 42, { dmax: .97, hmin: .5, avoid, seed: 31 });
  inst(G.palmTrunk, std('#a9763e', { flatShading: true }), palms.map(t => ({ ...t, s: 1.05 + t.r * .6 })));
  inst(G.palmTop, std('#ffffff', { flatShading: true, roughness: .7, side: THREE.DoubleSide }), palms.map(t => ({ ...t, s: 1.05 + t.r * .6 })), { color: (t) => C(t.r > .5 ? '#2fae4f' : '#46c25c') });
  const bushes = scatter(S0, 90, { avoid, seed: 32 });
  inst(G.bush, std('#ffffff', { flatShading: true }), bushes.map(t => ({ ...t, s: 1.1 + t.r })), { color: (t) => C(['#3fae4f', '#5bc65a', '#2f9a48', '#7ccf4a'][Math.floor(t.r * 4)]) });
  const fl = scatter(S0, 520, { avoid: avoid.map(a => ({ ...a, r: 3 })), seed: 33 });
  inst(G.flower, std('#ffffff'), fl.map(t => ({ ...t, y: t.y + .15, s: 1.3 + t.r })), { shadow: false, color: (t) => C(['#ff5fa2', '#ffd23f', '#ffffff', '#ff8a3d', '#b98cff', '#ff4d6d'][Math.floor(t.r * 6)]) });
  const rk = scatter(S0, 40, { dmin: .82, dmax: 1.02, hmin: -.4, slopeMax: 3, avoid, seed: 34 });
  inst(G.rock, std('#ffffff', { flatShading: true }), rk.map(t => ({ ...t, s: 1 + t.r * 2.2, sy: .6 + t.r * .4 })), { color: () => C('#a39882') });
  // pond lilies
  inst(new THREE.CircleGeometry(.7, 10).rotateX(-Math.PI / 2), std('#3fae4f'), Array.from({ length: 9 }, (_, k) => ({ x: -30 + Math.cos(k * 2.4) * 4, y: .06, z: 30 + Math.sin(k * 2.4) * 2.2, s: .8 + (k % 3) * .3 })), { shadow: false });
  // beach umbrellas + loungers
  for (const [ux, uz, c] of [[-40, 48, '#ff4d6d'], [-20, 52, '#ffc61a'], [10, 51, '#22b6f2'], [40, 49, '#ff4d6d']]) {
    const y = hOnly(ux, uz); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 3.2, 6), std('#f5f5f5')); pole.position.set(ux, y + 1.6, uz); pole.castShadow = true; scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.1, .9, 12), std(c, { flatShading: true })); top.position.set(ux, y + 3.2, uz); top.castShadow = true; scene.add(top);
    const towel = new THREE.Mesh(new THREE.BoxGeometry(1.2, .08, 2.4), std('#ffffff')); towel.position.set(ux + 1.8, y + .08, uz + .4); towel.rotation.y = .3; towel.receiveShadow = true; scene.add(towel);
  }
  // dock + boat
  for (let k = 0; k < 7; k++) { const plank = new THREE.Mesh(new THREE.BoxGeometry(3, .25, 1.2), std(k % 2 ? '#b07a45' : '#c08a54')); plank.position.set(-86 - k * .2, .55, 44 + k * 1.3); plank.castShadow = plank.receiveShadow = true; scene.add(plank); }
  for (const [px, pz] of [[-87.6, 44], [-84.4, 44], [-88.6, 52], [-85.4, 52]]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 2.4, 6), std('#7a5230')); post.position.set(px, .2, pz); post.castShadow = true; scene.add(post); }
  boat(-80, 58, .4, 1.1);
  // lighthouse on back-left hill
  { const x = -60, z = -34, y = hOnly(x, z); const lh = new THREE.Group();
    for (let k = 0; k < 5; k++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(1.3 - k * .12, 1.42 - k * .12, 1.6, 18), std(k % 2 ? '#e63946' : '#ffffff', { roughness: .5 })); seg.position.y = .8 + k * 1.6; lh.add(seg); }
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 1.1, 12), std('#fff3b0', { emissive: '#ffd34d', emissiveIntensity: 1.4 })); lamp.position.y = 8.6; lh.add(lamp);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.3, 12), std('#1f2a44')); cap.position.y = 9.8; lh.add(cap);
    lh.traverse(o => o.isMesh && (o.castShadow = true)); lh.position.set(x, y - .2, z); scene.add(lh); }
  // pedestals + stars + markers
  const starShape = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? .42 : 1; k ? starShape.lineTo(Math.cos(a) * rr, -Math.sin(a) * rr) : starShape.moveTo(Math.cos(a) * rr, -Math.sin(a) * rr); }
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: .25, bevelEnabled: true, bevelThickness: .12, bevelSize: .1, bevelSegments: 2 }).center();
  const goldM = std('#ffc61a', { metalness: .55, roughness: .28, emissive: '#ff9d00', emissiveIntensity: .25 }), dimM = std('#c9d2e0', { metalness: .2, roughness: .5 });
  for (const l of L) {
    const y = hOnly(l.x, l.z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.5, 1.3, 8), std('#ece3cf', { roughness: .85, flatShading: true })); base.position.set(l.x, y + .45, l.z); base.castShadow = base.receiveShadow = true; scene.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.7, .22, 8, 36).rotateX(Math.PI / 2), std(l.state === 'locked' ? '#9aa6b8' : '#e8b04a', { metalness: .5, roughness: .35 })); rim.position.set(l.x, y + 1.05, l.z); scene.add(rim);
    const topC = l.state === 'done' ? '#ffcf3a' : l.state === 'cur' ? '#ff2d8a' : '#b7c1cf';
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, .3, 36), std(topC, { emissive: topC, emissiveIntensity: l.state === 'locked' ? 0 : l.state === 'cur' ? .9 : .35, roughness: .35, metalness: .2 })); top.position.set(l.x, y + 1.08, l.z); scene.add(top);
    if (l.state === 'done') for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(starGeo, k < l.stars ? goldM : dimM); st.scale.setScalar(k === 1 ? 1.35 : 1.1); st.position.set(l.x + (k - 1) * 2.9, y + 7.4 + (k === 1 ? .9 : 0), l.z); st.rotation.set(-.25, (k - 1) * -.25, 0); st.castShadow = true; scene.add(st); }
    if (l.state === 'cur') {
      const cv = document.createElement('canvas'); cv.width = 4; cv.height = 128; const g = cv.getContext('2d'); const lg = g.createLinearGradient(0, 128, 0, 0); lg.addColorStop(0, 'rgba(255,120,190,.85)'); lg.addColorStop(1, 'rgba(255,120,190,0)'); g.fillStyle = lg; g.fillRect(0, 0, 4, 128);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.0, 22, 24, 1, true), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); beam.position.set(l.x, y + 12, l.z); scene.add(beam);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0).scale(1, 1.45, 1), std('#ff4fa3', { metalness: .3, roughness: .15, emissive: '#ff1f8a', emissiveIntensity: .6, flatShading: true })); gem.position.set(l.x, y + 7.2, l.z); gem.rotation.y = .6; gem.castShadow = true; scene.add(gem);
      const glow = new THREE.PointLight('#ff4fa3', 60, 18, 2); glow.position.set(l.x, y + 3, l.z); scene.add(glow);
    }
  }
  // bonus chests
  const host = (b) => L[b.host];
  const chestPos = STAGE.bonus.map((b, k) => { const h = host(b); return { ...b, x: h.x + [3, -3, 6][k], z: h.z + [-14, 15, -15][k], below: k === 1 }; });
  for (const c of chestPos) {
    const y = hOnly(c.x, c.z); const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 1.7), std(c.open ? '#9c5a2b' : '#8d97a8', { roughness: .7 })); body.position.y = .75; g.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(.85, .85, 2.6, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), std(c.open ? '#b86d34' : '#a3adbd')); lid.position.y = 1.5; g.add(lid);
    for (const bx of [-.9, .9]) { const band = new THREE.Mesh(new THREE.BoxGeometry(.22, 1.56, 1.76), std('#ffc61a', { metalness: .7, roughness: .3 })); band.position.set(bx, .75, 0); g.add(band); }
    const lockM = new THREE.Mesh(new THREE.BoxGeometry(.45, .55, .2), std('#ffc61a', { metalness: .7, roughness: .3 })); lockM.position.set(0, 1.25, .9); g.add(lockM);
    g.traverse(o => o.isMesh && (o.castShadow = true)); g.position.set(c.x, y, c.z); g.rotation.y = .3; scene.add(g);
    if (c.open) { const pl = new THREE.PointLight('#ffcf3a', 30, 10, 2); pl.position.set(c.x, y + 2.5, c.z + 1); scene.add(pl); }
    // dotted side trail
    const h = host(c); const tr = []; for (let k = 1; k < 9; k++) { const x = lerp(h.x, c.x, k / 9), z = lerp(h.z, c.z, k / 9); tr.push({ x, y: hOnly(x, z) + .1, z, s: .5, sy: .1 }); }
    inst(new THREE.CylinderGeometry(1, 1, 1, 8), std('#efd9a7'), tr, { shadow: false });
    c.y = y;
  }
  // boss castle
  { const y0 = hOnly(castle.x, castle.z); const g = new THREE.Group(); const stone = std('#efe6d4', { roughness: .8 }), stoneD = std('#d9ccb2', { roughness: .85 }), roofM = std('#e2366f', { flatShading: true, roughness: .5 }), goldF = std('#ffc61a', { metalness: .6, roughness: .3 });
    const keep = new THREE.Mesh(new THREE.BoxGeometry(9, 9, 7), stone); keep.position.y = 4.5; g.add(keep);
    for (let k = 0; k < 8; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(.9, 1, .9), stoneD); c.position.set(-4 + k * 1.15, 9.4, 3.3); g.add(c); }
    const hall = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 10), stoneD); hall.position.set(0, 2.5, 2); g.add(hall);
    for (const [tx, tz, th] of [[-7.5, 7, 9], [7.5, 7, 9], [-7.5, -3, 11], [7.5, -3, 11], [0, -1, 15]]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, th, 18), stone); t.position.set(tx, th / 2, tz); g.add(t);
      const rf = new THREE.Mesh(new THREE.ConeGeometry(2.5, 4.2, 18), roofM); rf.position.set(tx, th + 2.1, tz); g.add(rf);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.2, 6), goldF); pole.position.set(tx, th + 5, tz); g.add(pole);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .9), std('#ffc61a', { side: THREE.DoubleSide })); fl.position.set(tx + .75, th + 5.6, tz); g.add(fl);
      for (let w = 0; w < 3; w++) { const win = new THREE.Mesh(new THREE.BoxGeometry(.45, .9, .2), std('#3a2a5a', { emissive: '#ffcf6a', emissiveIntensity: .25 })); const a = w * .7 - .7; win.position.set(tx + Math.sin(a) * 2.02, th * .65, tz + Math.cos(a) * 2.02); win.rotation.y = a; g.add(win); }
    }
    const gate = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, .6, 20, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2 * 0), std('#3b2416')); gate.position.set(0, 2.4, 7.1); g.add(gate);
    const gateB = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, .6), std('#3b2416')); gateB.position.set(0, 1.2, 7.1); g.add(gateB);
    const chain = new THREE.Mesh(new THREE.TorusGeometry(1.1, .22, 8, 20), std('#cfd6e2', { metalness: .9, roughness: .25 })); chain.position.set(0, 2, 7.5); g.add(chain);
    g.traverse(o => o.isMesh && (o.castShadow = o.receiveShadow = true)); g.position.set(castle.x, y0 - .3, castle.z); g.rotation.y = -.25; scene.add(g);
    const aura = new THREE.PointLight('#ff3d8b', 120, 40, 2); aura.position.set(castle.x, y0 + 10, castle.z + 10); scene.add(aura);
    const stairs = []; for (let k = 0; k < 6; k++) stairs.push({ x: castle.x - 2 - k * .6, y: y0 - .6 - k * .5, z: castle.z + 9 + k * 1.2, s: 1, sx: 4.5, sy: .5, sz: 1.3, ry: -.25 }); inst(G.box, std('#e6dcc6'), stairs);
  }
  cloudsAt([{ x: -120, y: 30, z: -75, s: 2 }, { x: 115, y: 34, z: -85, s: 1.8 }, { x: 140, y: 26, z: 70, s: 1.4 }]);
  renderer.render(scene, camera);

  await loadIcons(['star', 'flame', 'snowflake', 'search', 'trophy', 'book-open', 'settings', 'lock', 'check', 'play', 'chevron-left', 'clock', 'sword', 'gift', 'zap', 'map', 'sparkles', 'repeat', 'target', 'arrow-right']);
  const lab = document.getElementById('labels');
  for (const l of L) {
    const y = hOnly(l.x, l.z);
    const p = project(new THREE.Vector3(l.x, y + 1.3, l.z));
    const name = `<div class="lname glass">${l.title}</div>`;
    lab.append(el(`<div class="lvl ${l.state}" style="left:${p.x}px;top:${p.y + 18}px"><div class="num">${l.state === 'locked' ? ic('lock') : l.n}</div>${l.state === 'cur' ? '' : name}</div>`));
    if (l.state === 'cur') {
      const q = project(new THREE.Vector3(l.x, y + 21, l.z));
      lab.append(el(`<div class="callout glass" style="left:${q.x}px;top:${q.y - 14}px"><div class="k">LEVEL ${l.n} · UP NEXT</div><div class="n">${l.title}</div>
        <div class="m"><span>${ic('clock')} ~12 min</span><span>${ic('zap')} 1 simulation</span><span>${ic('target')} 10-item test</span></div></div>`));
    }
  }
  const bp = project(new THREE.Vector3(castle.x + 14, 14, castle.z));
  lab.append(el(`<div class="bosscard glass" style="left:${Math.min(bp.x + 40, 1600 - 150)}px;top:${bp.y - 40}px"><span class="k">BOSS</span><div class="n">${STAGE.boss.split(' — ')[0]}</div><div class="d">${STAGE.boss.split(' — ')[1]}</div><div class="lk">${ic('lock')} Practice 1 more level to unlock</div></div>`));
  hudCommon();
  const hud = document.getElementById('hud');
  hud.append(el(`<div class="back glass"><div class="ico">${ic('chevron-left')}</div>WORLD MAP</div>`));
  hud.append(el(`<div class="stagehead glass"><div class="k">WORLD 1 · SUNNY SHORES · STAGE 2 OF 4</div><div class="n">${STAGE.title}</div><div class="pr"><div class="bar"><i style="width:${STAGE.got / STAGE.total * 100}%"></i></div>${ic('star')} ${STAGE.got} / ${STAGE.total} stars · 6 of 9 levels cleared · 1 of 3 bonus open</div></div>`));
  hud.append(el(`<div class="cta glass"><div class="next"><div class="thumb" style="background:linear-gradient(160deg,#ffc2dd,#f43f8e 45%,#b3125f)">7</div><div><div class="a">Level 7 · Number Systems</div><div class="b">Fixed Width & Overflow</div></div></div><div class="play">${ic('play')}PLAY</div></div>`));
  const rects = () => [...document.querySelectorAll('#labels > *, #hud > *')].map(e => e.getBoundingClientRect());
  const hit = (a, list) => list.some(b => a.left < b.right + 6 && a.right > b.left - 6 && a.top < b.bottom + 6 && a.bottom > b.top - 6);
  for (const c of chestPos) {
    const p = project(new THREE.Vector3(c.x, c.y + 2.6, c.z));
    const node = el(`<div class="bonus glass"><div class="k">BONUS ${c.open ? '' : '· LOCKED'}</div>${c.title}</div>`);
    const others = rects(); lab.append(node);
    const cands = [[0, -64], [0, 40]]; for (const rad of [90, 130, 170, 220]) for (let a = 0; a < 16; a++) cands.push([Math.cos(a / 16 * 6.283) * rad * 1.3, Math.sin(a / 16 * 6.283) * rad - 20]);
    const area = (a) => others.reduce((t, b) => t + Math.max(0, Math.min(a.right, b.right + 6) - Math.max(a.left, b.left - 6)) * Math.max(0, Math.min(a.bottom, b.bottom + 6) - Math.max(a.top, b.top - 6)), 0);
    let best = null;
    for (const [dx, dy] of cands) {
      node.style.left = `${p.x + dx}px`; node.style.top = `${p.y + dy}px`;
      const r = node.getBoundingClientRect(); if (r.left < 8 || r.right > 1592 || r.top < 8 || r.bottom > 892) continue;
      const ar = area(r); if (!best || ar < best[2]) best = [dx, dy, ar]; if (ar === 0) break;
    }
    node.style.left = `${p.x + best[0]}px`; node.style.top = `${p.y + best[1]}px`;
    if (Math.hypot(best[0], best[1] + 20) > 70) { const r = node.getBoundingClientRect(); const tx = Math.max(r.left + 14, Math.min(r.right - 14, p.x)), ty = p.y < r.top ? r.top : r.bottom;
      lab.prepend(el(`<svg style="position:absolute;left:0;top:0;width:1600px;height:900px;overflow:visible"><line x1="${p.x}" y1="${p.y}" x2="${tx}" y2="${ty}" stroke="#fff" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round" opacity=".95"/><circle cx="${p.x}" cy="${p.y}" r="5" fill="#ffc61a" stroke="#fff" stroke-width="2"/></svg>`)); }
  }
  if (clear) levelClear();
}

function levelClear() {
  document.body.classList.add('clear');
  const fx = document.getElementById('fx'); fx.style.background = 'none';
  const hud = document.getElementById('hud'); hud.innerHTML = '';
  hud.append(el(`<div class="dim"></div>`)); hud.append(el(`<div class="rays"></div>`));
  const r = mulberry(9); let conf = '<div class="confetti">';
  for (let k = 0; k < 110; k++) { const c = ['#ffc61a', '#ff4fa3', '#22d3ee', '#16d27f', '#8b5cf6', '#ffffff'][Math.floor(r() * 6)]; conf += `<i style="left:${r() * 1600}px;top:${r() * 860}px;background:${c};transform:rotate(${r() * 180}deg) scale(${.7 + r() * .9});opacity:${.6 + r() * .4}"></i>`; }
  hud.append(el(conf + '</div>'));
  hud.append(el(`<div class="modal glass">
    <div class="ribbon">LEVEL CLEAR!</div>
    <div class="bigstars">${starSvg(true, 'a')}${starSvg(true, 'b')}${starSvg(false, 'c')}</div>
    <div class="lt">Level 6 · Sign-Magnitude, One's & Two's Complement</div>
    <div class="ls">Number Systems & Arithmetic · World 1 Sunny Shores</div>
    <div class="tier"><span class="on">${ic('star')} Cleared · 70%+</span><span class="on">${ic('star')} Excellent · 90%+</span><span>${ic('repeat')} Mastered — review test in 3 days</span></div>
    <div class="rew">
      <div class="row"><div class="ri" style="background:linear-gradient(160deg,#a5f3fc,#22b6f2)">${ic('book-open')}</div>Lesson steps · 10 of 10<b>+50</b></div>
      <div class="row"><div class="ri" style="background:linear-gradient(160deg,#ddd6fe,#8b5cf6)">${ic('zap')}</div>Simulation goal reached<b>+20</b></div>
      <div class="row"><div class="ri" style="background:linear-gradient(160deg,#fde68a,#f59e0b)">${ic('target')}</div>Level test · 9 of 10 (90%)<b>+90</b></div>
      <div class="row"><div class="ri" style="background:linear-gradient(160deg,#bbf7d0,#16d27f)">${ic('sparkles')}</div>Studied + Cleared + 2nd star<b>+100</b></div>
      <div class="tot">TOTAL<b>+260 XP</b></div></div>
    <div class="unl"><div class="u"><div class="thumb" style="background:linear-gradient(160deg,#ffc2dd,#f43f8e 45%,#b3125f)">7</div><div><div class="a">UNLOCKED</div><div class="b">Level 7 · Fixed Width & Overflow</div></div></div>
      <div class="u"><div class="thumb" style="background:linear-gradient(160deg,#fff3a8,#ffcf3a 45%,#f59e0b)">${ic('gift')}</div><div><div class="a">BONUS OPENED</div><div class="b">Logical & Arithmetic Shifts</div></div></div></div>
    <div class="btns"><div class="btn2 glass">${ic('map')} MAP</div><div class="play">NEXT LEVEL ${ic('arrow-right')}</div></div></div>`));
  hud.append(el(`<div class="xpfly">+260 XP</div>`));
}

(async () => {
  await document.fonts.load('800 20px Outfit'); await document.fonts.load('600 14px Inter');
  if (VIEW === 'world') await worldView(); else await stageView(VIEW === 'clear');
  await document.fonts.ready;
  window.__ready = true;
})().catch(e => { document.title = 'ERR ' + e.message; console.error(e); window.__err = String(e.stack || e); });
