import { describe, expect, it } from 'vitest';
import { curriculum, levelsOfStage, worldById } from '../content';
import { stageLayout, worldLayout } from './layout';
import { generateTerrain, makeHeightFn, sampleHeight } from './terrain';
import { createNoise, hashString, mulberry32 } from './noise';

describe('noise', () => {
  it('is deterministic per seed and bounded', () => {
    const a = createNoise(42);
    const b = createNoise(42);
    const c = createNoise(43);
    expect(a.fbm(1.3, 2.7)).toBe(b.fbm(1.3, 2.7));
    expect(a.fbm(1.3, 2.7)).not.toBe(c.fbm(1.3, 2.7));
    for (let i = 0; i < 500; i++) expect(Math.abs(a.simplex(i * 0.37, i * 0.11))).toBeLessThanOrEqual(1.0001);
  });
  it('PRNG and hash are stable', () => {
    expect(mulberry32(1)()).toBe(mulberry32(1)());
    expect(hashString('operating-systems')).toBe(hashString('operating-systems'));
  });
});

describe('worldLayout', () => {
  const wl = worldLayout(curriculum, () => false);
  it('places every world once, islands apart, route through every dock', () => {
    expect(wl.islands.map((i) => i.world.id)).toEqual(curriculum.worlds.map((w) => w.id));
    for (const a of wl.islands)
      for (const b of wl.islands)
        if (a !== b)
          expect(Math.hypot(a.spec.x - b.spec.x, a.spec.z - b.spec.z)).toBeGreaterThan(a.spec.rx + b.spec.rx - 2);
    expect(wl.route).toHaveLength(curriculum.worlds.length);
  });
  it('puts a flag for every stage on its island', () => {
    for (const isl of wl.islands) {
      expect(isl.stageSpots.map((s) => s.stageId)).toEqual(isl.world.stageIds);
      for (const s of isl.stageSpots)
        expect(Math.hypot((s.x - isl.spec.x) / isl.spec.rx, (s.z - isl.spec.z) / isl.spec.rz)).toBeLessThan(0.8);
    }
  });
});

describe('stageLayout (all 41 real stages)', () => {
  for (const stage of curriculum.stages) {
    it(`${stage.id}: one pedestal per core level in order, one chest per bonus, no overlaps, all on the island`, () => {
      const levels = levelsOfStage(stage.id);
      const L = stageLayout(stage, levels, worldById.get(stage.worldId)!.biomeKind);
      expect(L.pedestals.map((p) => p.number)).toEqual(Array.from({ length: stage.coreLevelCount }, (_, i) => i + 1));
      expect(L.chests).toHaveLength(stage.levelCount - stage.coreLevelCount);
      const things = [...L.pedestals, ...L.chests, L.castle];
      for (let i = 0; i < things.length; i++)
        for (let j = i + 1; j < things.length; j++)
          expect(Math.hypot(things[i]!.x - things[j]!.x, things[i]!.z - things[j]!.z)).toBeGreaterThanOrEqual(7.4);
      for (const t of [...things, L.dock])
        expect(Math.hypot((t.x - L.island.x) / L.island.rx, (t.z - L.island.z) / L.island.rz)).toBeLessThan(0.92);
      expect(L.signposts.length).toBeGreaterThan(0);
      expect(stageLayout(stage, levels, 'palm')).toEqual(stageLayout(stage, levels, 'palm'));
    });
  }
});

describe('terrain', () => {
  it('raises land on islands, keeps open sea below water, and samples consistently', () => {
    const st = curriculum.stages[1]!;
    const L = stageLayout(st, levelsOfStage(st.id), 'palm');
    const spec = { seed: 7, bounds: L.bounds, segX: 80, segZ: 60, islands: [L.island] };
    const t = generateTerrain(spec);
    const hf = makeHeightFn(spec);
    expect(hf(L.island.x, L.island.z).h).toBeGreaterThan(0.5);
    expect(hf(L.bounds.x0 + 1, L.bounds.z0 + 1).h).toBeLessThan(-3);
    for (const p of L.pedestals) expect(sampleHeight(t, p.x, p.z)).toBeGreaterThan(0.3);
    expect(t.colors.every((v) => v >= 0 && v <= 1)).toBe(true);
  });
});
