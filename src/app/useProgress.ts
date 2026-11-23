import { useMemo } from 'react';
import { useLearner, clearedSet } from '@/engine/progress/learner';
import { levelState, nextCoreLevel } from '@/engine/progress/availability';
import { curriculum, type Level } from '@/engine/content';
import type { MedalState } from '@/ui/components';

/** Derived progress view used by pages: cleared set, next level, and per-level medal state. */
export function useProgress() {
  const stars = useLearner((s) => s.stars);
  return useMemo(() => {
    const cleared = clearedSet(stars);
    const next = nextCoreLevel(curriculum, cleared);
    const medal = (l: Level): MedalState => {
      const st = levelState(l, cleared);
      if (st === 'cleared') return 'cleared';
      if (next && l.id === next.id) return 'current';
      return st;
    };
    return { stars, cleared, next, medal, starsOf: (id: string) => stars.get(id) ?? 0 };
  }, [stars]);
}
