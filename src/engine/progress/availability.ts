import type { Curriculum, Level } from '../content/schema';

export type LevelState = 'locked' | 'available' | 'cleared';

/** A level is available when every prerequisite is Cleared (its level test passed). */
export function levelState(level: Level, cleared: ReadonlySet<string>): LevelState {
  if (cleared.has(level.id)) return 'cleared';
  return level.requires.every((r) => cleared.has(r)) ? 'available' : 'locked';
}

/** Prerequisites still blocking a level, in listed order. */
export function missingPrerequisites(level: Level, cleared: ReadonlySet<string>): string[] {
  return level.requires.filter((r) => !cleared.has(r));
}

/** Next level on the global Core Path that is not yet cleared (always available by Core Path closure). */
export function nextCoreLevel(c: Curriculum, cleared: ReadonlySet<string>): Level | null {
  let best: Level | null = null;
  for (const l of c.levels)
    if (l.corePathPosition !== null && !cleared.has(l.id) && (!best || l.corePathPosition < best.corePathPosition!))
      best = l;
  return best;
}

export interface Tally {
  levels: number;
  cleared: number;
  available: number;
}

export function tally(levels: readonly Level[], cleared: ReadonlySet<string>): Tally {
  let c = 0;
  let a = 0;
  for (const l of levels) {
    const s = levelState(l, cleared);
    if (s === 'cleared') c++;
    else if (s === 'available') a++;
  }
  return { levels: levels.length, cleared: c, available: a };
}
