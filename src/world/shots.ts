import type { StageLayout, WorldLayout } from '@/engine/world/layout';

type V3 = [number, number, number];
export interface Shot {
  position: V3;
  target: V3;
}

export const worldShot = (wl: WorldLayout): Shot => {
  const cx = (wl.bounds.x0 + wl.bounds.x1) / 2;
  const cz = (wl.bounds.z0 + wl.bounds.z1) / 2;
  return { position: [cx, 232, cz + 180], target: [cx, 0, cz] };
};

export const islandShot = (wl: WorldLayout, worldId: string): Shot | null => {
  const i = wl.islands.find((x) => x.world.id === worldId);
  if (!i) return null;
  return { position: [i.spec.x + 6, 68, i.spec.z + 74], target: [i.spec.x, 1.5, i.spec.z + 4] };
};

export const stageShot = (L: StageLayout, focus: { x: number; z: number } | null): Shot => {
  // The level card sits on the right, so aim a little to the right of the level to keep it left of centre.
  if (focus) return { position: [focus.x + 12, 60, focus.z + 64], target: [focus.x + 10, 2, focus.z - 4] };
  const size = Math.max(L.island.rx, L.island.rz * 1.4);
  return {
    position: [L.island.x, size * 1.02 + 30, L.island.z + size * 1.1 + 30],
    target: [L.island.x, 0, L.island.z - size * 0.12],
  };
};
