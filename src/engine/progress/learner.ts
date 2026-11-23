import { create } from 'zustand';
import type { TestResult } from '../lesson/testEngine';
import { STEP_XP, STUDIED_XP, testXp } from '../lesson/testEngine';

export type Stars = 0 | 1 | 2 | 3;

/** XP for reaching a simulation goal (docs/blueprint/03). */
export const SIM_GOAL_XP = 20;

/**
 * Learner progress, held in memory. Phase 4 adds the event log, FSRS review scheduling
 * and IndexedDB persistence; the reducers below are pure so that layer can replay them.
 */
export interface LearnerData {
  xp: number;
  /** Stars per level id; ≥ 1 means the level test was passed (Cleared). */
  stars: ReadonlyMap<string, Stars>;
  /** Lesson steps seen, per level. */
  seen: ReadonlyMap<string, ReadonlySet<string>>;
  /** Level-test attempts started, per level. */
  attempts: ReadonlyMap<string, number>;
  /** Simulation goals reached, as `${levelId}:${simId}`. */
  simGoals: ReadonlySet<string>;
  streakDays: number;
  freezes: number;
}

export const EMPTY_LEARNER: LearnerData = {
  xp: 0,
  stars: new Map(),
  seen: new Map(),
  attempts: new Map(),
  simGoals: new Set(),
  streakDays: 0,
  freezes: 0,
};

/** First view of a step: +5 XP; seeing the last unseen step of a lesson: +25 XP (studied). */
export function viewStep(d: LearnerData, levelId: string, stepId: string, allStepIds: readonly string[]): LearnerData {
  const prev = d.seen.get(levelId) ?? new Set<string>();
  if (prev.has(stepId)) return d;
  const next = new Set(prev).add(stepId);
  const studied = allStepIds.every((s) => next.has(s));
  return { ...d, xp: d.xp + STEP_XP + (studied ? STUDIED_XP : 0), seen: new Map(d.seen).set(levelId, next) };
}

export function reachSimGoal(d: LearnerData, levelId: string, simId: string): LearnerData {
  const key = `${levelId}:${simId}`;
  if (d.simGoals.has(key)) return d;
  return { ...d, xp: d.xp + SIM_GOAL_XP, simGoals: new Set(d.simGoals).add(key) };
}

export function startAttempt(d: LearnerData, levelId: string): LearnerData {
  return { ...d, attempts: new Map(d.attempts).set(levelId, (d.attempts.get(levelId) ?? 0) + 1) };
}

/** Records a graded test: stars never go down; XP per testXp. Returns the new data and the XP gained. */
export function recordTest(d: LearnerData, levelId: string, result: TestResult): { data: LearnerData; xp: number } {
  const before = d.stars.get(levelId) ?? 0;
  const xp = testXp(result, d.attempts.get(levelId) ?? 1, before);
  const stars = Math.max(before, result.stars) as Stars;
  return {
    data: { ...d, xp: d.xp + xp, stars: stars === before ? d.stars : new Map(d.stars).set(levelId, stars) },
    xp,
  };
}

interface Actions {
  viewStep(levelId: string, stepId: string, all: readonly string[]): void;
  reachSimGoal(levelId: string, simId: string): void;
  startAttempt(levelId: string): number;
  recordTest(levelId: string, result: TestResult): number;
}

export const useLearner = create<LearnerData & Actions>((set, get) => ({
  ...EMPTY_LEARNER,
  viewStep: (l, s, all) => set((d) => viewStep(d, l, s, all)),
  reachSimGoal: (l, s) => set((d) => reachSimGoal(d, l, s)),
  startAttempt: (l) => {
    set((d) => startAttempt(d, l));
    return get().attempts.get(l)!;
  },
  recordTest: (l, r) => {
    const { data, xp } = recordTest(get(), l, r);
    set(data);
    return xp;
  },
}));

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
