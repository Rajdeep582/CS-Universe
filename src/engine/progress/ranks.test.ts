import { describe, expect, it } from 'vitest';
import { RANKS, rankFor } from './ranks';

describe('rankFor', () => {
  it('starts at Bit with progress toward Nibble', () => {
    expect(rankFor(0)).toMatchObject({ number: 1, name: 'Bit', next: { name: 'Nibble', xp: 150 }, progress: 0 });
    expect(rankFor(75).progress).toBeCloseTo(0.5);
  });
  it('switches exactly at each threshold', () => {
    RANKS.forEach((r, i) => {
      expect(rankFor(r.xp).number).toBe(i + 1);
      if (r.xp > 0) expect(rankFor(r.xp - 1).number).toBe(i);
    });
  });
  it('matches the Phase 0 render (27,350 XP = Protocol, 8,650 to Compiler)', () => {
    const r = rankFor(27_350);
    expect(r.name).toBe('Protocol');
    expect(r.next!.xp - 27_350).toBe(8_650);
  });
  it('caps at Universal', () => {
    expect(rankFor(10_000_000)).toMatchObject({ name: 'Universal', next: null, progress: 1 });
  });
  it('rejects invalid xp', () => {
    expect(() => rankFor(-1)).toThrow(RangeError);
    expect(() => rankFor(Number.NaN)).toThrow(RangeError);
  });
  it('thresholds strictly increase', () => {
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i]!.xp).toBeGreaterThan(RANKS[i - 1]!.xp);
  });
});
