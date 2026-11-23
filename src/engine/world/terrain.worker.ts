/// <reference lib="webworker" />
import { generateTerrain, type TerrainSpec } from './terrain';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
ctx.onmessage = (e: MessageEvent<{ id: number; spec: TerrainSpec }>) => {
  const t = generateTerrain(e.data.spec);
  ctx.postMessage({ id: e.data.id, t }, [t.heights.buffer, t.colors.buffer, t.owner.buffer]);
};
