import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/validate';
import type { RawContent } from '../content/schema';
import { levelState, missingPrerequisites, nextCoreLevel, tally } from './availability';

const raw: RawContent = {
  corePath: { stages: ['s1'] },
  worlds: [
    {
      folder: '01-w',
      file: { id: 'w', order: 1, title: 'W', tagline: 't', biome: 'b', biomeKind: 'k', color: '#000000' },
      stages: [
        {
          folder: '01-s1',
          file: {
            id: 's1',
            order: 1,
            title: 'S',
            tier: 0,
            refs: ['r'],
            boss: { title: 'B', description: 'D' },
            units: [
              {
                id: 'u',
                title: 'U',
                levels: [
                  { id: 'a', title: 'A', core: true, requires: [] },
                  { id: 'b', title: 'B', core: true, requires: ['a'] },
                  { id: 'c', title: 'C', core: false, requires: ['a', 'b'] },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
};
const c = compileContent(raw).curriculum!;
const L = (id: string) => c.levels.find((l) => l.id === id)!;

describe('availability', () => {
  it('new learner: only roots are available', () => {
    const none = new Set<string>();
    expect(levelState(L('a'), none)).toBe('available');
    expect(levelState(L('b'), none)).toBe('locked');
    expect(missingPrerequisites(L('c'), none)).toEqual(['a', 'b']);
  });
  it('unlocks only when every prerequisite is cleared', () => {
    expect(levelState(L('c'), new Set(['a']))).toBe('locked');
    expect(levelState(L('c'), new Set(['a', 'b']))).toBe('available');
    expect(levelState(L('a'), new Set(['a']))).toBe('cleared');
  });
  it('next core level follows the Core Path and skips bonus levels', () => {
    expect(nextCoreLevel(c, new Set())!.id).toBe('a');
    expect(nextCoreLevel(c, new Set(['a']))!.id).toBe('b');
    expect(nextCoreLevel(c, new Set(['a', 'b']))).toBeNull();
  });
  it('tallies states', () => {
    expect(tally(c.levels, new Set(['a']))).toEqual({ levels: 3, cleared: 1, available: 1 });
  });
});
