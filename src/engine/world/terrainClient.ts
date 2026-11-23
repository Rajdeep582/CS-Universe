import { generateTerrain, type TerrainData, type TerrainSpec } from './terrain';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (t: TerrainData) => void>();
const cache = new Map<string, Promise<TerrainData>>();

function getWorker(): Worker | null {
  if (worker || typeof Worker === 'undefined') return worker;
  try {
    worker = new Worker(new URL('./terrain.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; t: TerrainData }>) => {
      pending.get(e.data.id)?.(e.data.t);
      pending.delete(e.data.id);
    };
  } catch {
    worker = null;
  }
  return worker;
}

/** Generates terrain off the main thread (falls back to in-thread when workers are unavailable). Cached per spec. */
export function requestTerrain(spec: TerrainSpec): Promise<TerrainData> {
  const key = JSON.stringify(spec);
  const hit = cache.get(key);
  if (hit) return hit;
  const w = getWorker();
  const p = w
    ? new Promise<TerrainData>((resolve) => {
        const id = ++seq;
        pending.set(id, resolve);
        w.postMessage({ id, spec });
      })
    : Promise.resolve(generateTerrain(spec));
  cache.set(key, p);
  if (cache.size > 8) cache.delete(cache.keys().next().value!);
  return p;
}
