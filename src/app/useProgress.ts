import { useMemo } from 'react';
import { useLearner, clearedSet } from '@/engine/progress/learner';
import { levelState, nextCoreLevel } from '@/engine/progress/availability';
import { dueReviews } from '@/engine/progress/replay';
import { dayKey } from '@/engine/progress/events';
import { usePrefs } from '@/engine/progress/settings';
import { curriculum, type Level } from '@/engine/content';
import { lessons } from '@/play/lessons';
import type { MedalState } from '@/ui/components';

export interface LevelInfo {
  medal: MedalState;
  stars: number;
  /** 0..1 steps seen (only meaningful before clearing). */
  progress: number;
  studied: boolean;
  due: boolean;
  mastered: boolean;
  /** Mastered but the latest review failed. */
  dim: boolean;
  nextReview: Date | null;
}

/** Derived progress view used by pages: cleared set, next level, reviews due, per-level medal and info. */
export function useProgress() {
  const stars = useLearner((s) => s.stars);
  const levels = useLearner((s) => s.levels);
  const days = useLearner((s) => s.days);
  const cap = usePrefs((s) => s.reviewCap);
  return useMemo(() => {
    const now = new Date();
    const cleared = clearedSet(stars);
    const next = nextCoreLevel(curriculum, cleared);
    const due = dueReviews({ levels, days }, now, dayKey(now), cap);
    const dueSet = new Set(due.map((d) => d.levelId));
    /** A review at least a day past due — it takes the single CONTINUE slot before the next new level (03 §9). */
    const overdue = due.find((d) => now.getTime() - d.due.getTime() >= 86_400_000) ?? null;
    const medal = (l: Level): MedalState => {
      const st = levelState(l, cleared);
      if (st === 'cleared') return 'cleared';
      if (next && l.id === next.id) return 'current';
      return st;
    };
    const info = (l: Level): LevelInfo => {
      const p = levels.get(l.id);
      const steps = lessons[l.id]?.steps.length ?? 0;
      return {
        medal: medal(l),
        stars: stars.get(l.id) ?? 0,
        progress: p && steps ? p.seen.size / steps : 0,
        studied: p?.studied ?? false,
        due: dueSet.has(l.id),
        mastered: (p?.mastered ?? false) && !p?.masteryDim,
        dim: (p?.mastered ?? false) && (p?.masteryDim ?? false),
        nextReview: p?.card?.due ?? null,
      };
    };
    /** Props for <LevelMedallion> showing every level state (progress ring, review due, mastered). */
    const medalProps = (l: Level) => {
      const i = info(l);
      return { state: i.medal, number: l.number, progress: i.progress, due: i.due, mastered: i.mastered };
    };
    return { stars, cleared, next, due, overdue, medal, info, medalProps, starsOf: (id: string) => stars.get(id) ?? 0 };
  }, [stars, levels, days, cap]);
}
