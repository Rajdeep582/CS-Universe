import * as THREE from 'three';
import { SEA_FLOOR, heightTexture, type TerrainData } from './terrain';

/** Stylised ocean: depth tint from the terrain heightfield, shoreline foam bands, caustic shimmer, fresnel sky, sun glint. */
export function createWaterMaterial(
  t: TerrainData,
  sunDir: THREE.Vector3,
  fog: THREE.Color,
  fogNear: number,
  fogFar: number,
) {
  const tex = new THREE.DataTexture(heightTexture(t), t.segX + 1, t.segZ + 1, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return new THREE.ShaderMaterial({
    uniforms: {
      hmap: { value: tex },
      bmin: { value: new THREE.Vector2(t.bounds.x0, t.bounds.z0) },
      bsize: { value: new THREE.Vector2(t.bounds.x1 - t.bounds.x0, t.bounds.z1 - t.bounds.z0) },
      sunDir: { value: sunDir.clone().normalize() },
      fogC: { value: fog },
      fogN: { value: fogNear },
      fogF: { value: fogFar },
      floorH: { value: SEA_FLOOR },
      t: { value: 3.7 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D hmap; uniform vec2 bmin, bsize; uniform vec3 sunDir, fogC; uniform float fogN, fogF, floorH, t;
      varying vec3 vW;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float wav(vec2 p) { return vn(p + vec2(t * .3, t * .2)) * .5 + vn(p * 2.1 - vec2(t * .25, -t * .1)) * .3 + vn(p * 4.3 + t * .4) * .2; }
      void main() {
        vec2 uv = (vW.xz - bmin) / bsize;
        float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        float h = mix(floorH, texture2D(hmap, clamp(uv, 0.0, 1.0)).r * 8.0 + floorH, inside);
        float depth = clamp(-h / 5.5, 0.0, 1.0);
        vec3 shallow = vec3(.36, .93, .90), mid = vec3(.07, .66, .90), deep = vec3(.02, .36, .70);
        vec3 col = mix(shallow, mid, smoothstep(.02, .32, depth)); col = mix(col, deep, smoothstep(.35, 1.0, depth));
        vec2 p = vW.xz * .32; float w0 = wav(p), wx = wav(p + vec2(.08, 0.)), wz = wav(p + vec2(0., .08));
        vec3 N = normalize(vec3((w0 - wx) * 3.2, 1.0, (w0 - wz) * 3.2));
        vec3 V = normalize(cameraPosition - vW);
        float caus = pow(abs(sin(wav(vW.xz * .55) * 9.0)), 6.0);
        col += (1.0 - smoothstep(0.0, .35, depth)) * caus * .10;
        float shore = smoothstep(-1.25, -.05, h);
        float band = .5 + .5 * sin(h * 10.0 + w0 * 7.0 + t * 1.2);
        float foam = shore * smoothstep(.35, .9, band) * .75 + smoothstep(-.35, -.02, h) * .9;
        col = mix(col, vec3(1.0), clamp(foam, 0.0, 1.0) * .85);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
        col = mix(col, vec3(.80, .94, 1.0), fres * .45);
        vec3 R = reflect(-sunDir, N); col += vec3(1.0, .95, .85) * pow(max(dot(R, V), 0.0), 160.0) * 1.1;
        float dist = length(cameraPosition - vW); col = mix(col, fogC, smoothstep(fogN, fogF, dist));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
