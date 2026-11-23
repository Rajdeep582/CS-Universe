import { useMemo } from 'react';
import { useLearner } from '@/engine/progress/learner';
import { usePrefs } from '@/engine/progress/settings';
import { dayKey } from '@/engine/progress/events';
import { streakOn, weeklyStreak } from '@/engine/progress/streak';

/** Streak as of today, in the learner's chosen mode (daily with freezes, or weekly goal). */
export function useStreak() {
  const streak = useLearner((s) => s.streak);
  const days = useLearner((s) => s.days);
  const mode = usePrefs((s) => s.streakMode);
  const target = usePrefs((s) => s.weeklyTarget);
  return useMemo(() => {
    const today = dayKey(new Date());
    const daily = streakOn(streak, today);
    const weekly = weeklyStreak(new Set(days.keys()), today, target);
    return { mode, today, daily, weekly, target, activeToday: days.has(today) };
  }, [streak, days, mode, target]);
}
