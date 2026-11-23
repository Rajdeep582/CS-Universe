import { create } from 'zustand';

export type Stars = 0 | 1 | 2 | 3;

/**
 * Learner progress. Phase 1 holds the state of a brand-new learner in memory;
 * Phase 4 adds the event log, XP rules, FSRS and IndexedDB persistence.
 */
export interface LearnerState {
  xp: number;
  /** Stars per level id; ≥ 1 means the level test was passed (Cleared). */
  stars: ReadonlyMap<string, Stars>;
  streakDays: number;
  freezes: number;
}

export const useLearner = create<LearnerState>(() => ({ xp: 0, stars: new Map(), streakDays: 0, freezes: 0 }));

export const clearedSet = (stars: ReadonlyMap<string, Stars>): Set<string> => {
  const s = new Set<string>();
  for (const [id, n] of stars) if (n >= 1) s.add(id);
  return s;
};

export const starTotal = (stars: ReadonlyMap<string, Stars>): number => {
  let t = 0;
  for (const n of stars.values()) t += n;
  return t;
};
