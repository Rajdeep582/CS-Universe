import { addDays, daysBetween } from './events';

/** Streak rules from docs/blueprint/03 §5: any activity counts; +1 freeze per 7 days (max 3), auto-applied. */
export interface Streak {
  current: number;
  best: number;
  freezes: number;
  /** Last day with activity, or null. */
  lastDay: string | null;
  /** Days covered by a freeze (for the journal / calendar). */
  frozen: string[];
}
export const MAX_FREEZES = 3;
export const FREEZE_EVERY = 7;
export const EMPTY_STREAK: Streak = { current: 0, best: 0, freezes: 0, lastDay: null, frozen: [] };

/** Applies the missed days strictly between lastDay and `day` (exclusive): each consumes a freeze or ends the streak. */
function bridge(s: Streak, day: string): Streak {
  if (!s.lastDay) return s;
  const missed = daysBetween(s.lastDay, day) - 1;
  if (missed <= 0 || s.current === 0) return missed > 0 ? { ...s, current: 0 } : s;
  if (missed <= s.freezes) {
    const frozen = Array.from({ length: missed }, (_, i) => addDays(s.lastDay!, i + 1));
    return { ...s, freezes: s.freezes - missed, frozen: [...s.frozen, ...frozen], lastDay: addDays(s.lastDay, missed) };
  }
  return { ...s, current: 0, freezes: 0 };
}

/** Records activity on `day` (days arrive in non-decreasing order). */
export function activity(s: Streak, day: string): Streak {
  if (s.lastDay === day) return s;
  if (s.lastDay && daysBetween(s.lastDay, day) < 0) return s;
  const b = bridge(s, day);
  const current = b.current + 1;
  const freezes = current % FREEZE_EVERY === 0 ? Math.min(MAX_FREEZES, b.freezes + 1) : b.freezes;
  return { ...b, current, best: Math.max(b.best, current), freezes, lastDay: day };
}

/** The streak as of `today` (missed days before today are settled; today itself is never a miss). */
export function streakOn(s: Streak, today: string): Streak & { broken: boolean } {
  if (!s.lastDay || s.lastDay === today) return { ...s, broken: false };
  const b = bridge(s, today);
  return { ...b, broken: s.current > 0 && b.current === 0 };
}

/** Weekly mode: consecutive Monday-based weeks with ≥ target active days; the current week counts once met. */
export function weeklyStreak(
  days: ReadonlySet<string>,
  today: string,
  target: number,
): { weeks: number; thisWeek: number } {
  const monday = (k: string) => {
    const dow = (new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10))).getUTCDay() + 6) % 7;
    return addDays(k, -dow);
  };
  const count = (wk: string) => Array.from({ length: 7 }, (_, i) => addDays(wk, i)).filter((d) => days.has(d)).length;
  let wk = monday(today);
  const thisWeek = count(wk);
  let weeks = thisWeek >= target ? 1 : 0;
  for (;;) {
    wk = addDays(wk, -7);
    if (count(wk) < target) break;
    weeks++;
  }
  return { weeks, thisWeek };
}
