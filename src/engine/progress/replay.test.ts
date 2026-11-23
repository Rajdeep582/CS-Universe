import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, EventSchema, type EventInput, type LearnerEvent } from './events';
import { dueReviews, replay, reduce, EMPTY_STATE, XP, type ReplayContext } from './replay';
import { activity, EMPTY_STREAK, streakOn, weeklyStreak } from './streak';

const STEPS = ['a', 'b', 'c'];
const ctx: ReplayContext = {
  retention: 0.9,
  stepsOf: (l) => (l === 'lv' || l === 'lv2' ? STEPS : []),
  dailyGoals: false,
  worldOfStage: (s) => (s === 's1' || s === 's2' ? 'w1' : undefined),
  stagesOfWorld: (w) => (w === 'w1' ? ['s1', 's2'] : []),
};
const T0 = Date.UTC(2026, 0, 5, 10); // Monday 5 Jan 2026, 10:00 UTC
const DAY = 86_400_000;
let seq = 0;
/** Event on day `d` after T0 (local day == UTC day in these tests), hour 10. */
function ev(d: number, e: EventInput, hour = 10): LearnerEvent {
  const at = T0 + d * DAY + seq++;
  return { ...e, at, day: addDays('2026-01-05', d), hour } as LearnerEvent;
}
const study = (d: number, level = 'lv') => STEPS.map((step) => ev(d, { t: 'step', level, step }));
const test = (d: number, correct: number, level = 'lv', proveIt = false) =>
  ev(d, { t: 'test', level, correct, total: 10, ms: 60_000, proveIt });
const review = (d: number, correct: number, total = 5, level = 'lv') =>
  ev(d, { t: 'review', level, correct, total, ms: 30_000 });

describe('day arithmetic', () => {
  it('handles month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-02-27', '2026-03-02')).toBe(3);
  });
});

describe('replay — XP economy (03 §2)', () => {
  it('study + perfect test: 3×5 + 25 + 10×10 + 50 + 25', () => {
    const s = replay([...study(0), test(0, 10)], ctx);
    expect(s.xp).toBe(15 + 25 + 100 + 50 + 25);
    expect(s.stars.get('lv')).toBe(2);
    expect(s.levels.get('lv')!.studied).toBe(true);
    expect([...s.achievements.keys()]).toEqual(
      expect.arrayContaining(['first-light', 'level-up', 'sharp-mind', 'flawless']),
    );
  });
  it('repeat views, repeat sim goals and retakes do not re-award', () => {
    const s = replay(
      [
        ...study(0),
        ...study(0),
        ev(0, { t: 'sim', level: 'lv', sim: 'x' }),
        ev(0, { t: 'sim', level: 'lv', sim: 'x' }),
        test(0, 6),
        test(0, 8),
        test(0, 8),
      ],
      ctx,
    );
    // 40 study + 20 sim + 60 (first attempt items) + 40 + 50 (2nd attempt, clear) + 40 (3rd)
    expect(s.xp).toBe(40 + 20 + 60 + 40 + 50 + 40);
    expect(s.stars.get('lv')).toBe(1);
    expect(s.achievements.has('second-wind')).toBe(true);
  });
  it('prove it: clears without study XP and earns the hidden badge', () => {
    const s = replay([test(0, 7, 'lv', true)], ctx);
    expect(s.xp).toBe(70 + 50);
    expect(s.achievements.has('proved-it')).toBe(true);
  });
  it('replay is deterministic and order-independent of input order', () => {
    const evs = [...study(0), test(0, 9), review(4, 5), review(20, 2)];
    const a = replay(evs, ctx);
    const b = replay([...evs].reverse(), ctx);
    expect(b.xp).toBe(a.xp);
    expect([...b.stars]).toEqual([...a.stars]);
    expect(b.levels.get('lv')!.card!.due.getTime()).toBe(a.levels.get('lv')!.card!.due.getTime());
    expect(b.journal).toEqual(a.journal);
  });
  it('rank-ups are journaled', () => {
    const s = replay([...study(0), test(0, 10)], ctx);
    expect(s.journal.filter((j) => j.kind === 'rank').map((j) => j.ref)).toEqual(['Nibble']);
  });
});

describe('replay — reviews and mastery (03 §1, §4)', () => {
  it('clearing creates a card due in days; reviews before clearing are ignored', () => {
    const s = replay([review(0, 5), ...study(0), test(0, 9)], ctx);
    const card = s.levels.get('lv')!.card!;
    expect(card.due.getTime()).toBeGreaterThan(T0 + DAY);
    expect(s.reviewsPassed).toBe(0);
    expect(dueReviews(s, new Date(T0), '2026-01-05', 15)).toEqual([]);
    expect(dueReviews(s, new Date(T0 + 30 * DAY), '2026-02-04', 15).map((r) => r.levelId)).toEqual(['lv']);
  });
  it('a passed review < 3 days after clearing gives +10 but not mastery; ≥ 3 days masters (+75, ★★★)', () => {
    const early = replay([...study(0), test(0, 9), review(2, 5)], ctx);
    expect(early.levels.get('lv')!.mastered).toBe(false);
    expect(early.xp).toBe(40 + 90 + 75 + 10);
    const s = replay([...study(0), test(0, 9), review(3, 4)], ctx);
    expect(s.levels.get('lv')!.mastered).toBe(true);
    expect(s.stars.get('lv')).toBe(3);
    expect(s.xp).toBe(40 + 90 + 75 + XP.review + XP.mastered);
    expect(s.achievements.has('long-memory')).toBe(true);
  });
  it('a failed review dims the third star until the next pass; never removes progress', () => {
    let s = replay([...study(0), test(0, 9), review(3, 5), review(20, 1)], ctx);
    expect(s.stars.get('lv')).toBe(2);
    expect(s.levels.get('lv')!.mastered).toBe(true);
    const xp = s.xp;
    s = replay([...study(0), test(0, 9), review(3, 5), review(20, 1), review(40, 5)], ctx);
    expect(s.stars.get('lv')).toBe(3);
    expect(s.xp).toBe(xp + XP.review); // no second mastery bonus
  });
  it('FSRS: passing pushes the next review further out than failing', () => {
    const pass = replay([...study(0), test(0, 9), review(3, 5)], ctx)
      .levels.get('lv')!
      .card!.due.getTime();
    const fail = replay([...study(0), test(0, 9), review(3, 1)], ctx)
      .levels.get('lv')!
      .card!.due.getTime();
    expect(pass).toBeGreaterThan(fail);
  });
  it('higher target retention schedules sooner', () => {
    const at = (r: number) =>
      replay([...study(0), test(0, 9)], { ...ctx, retention: r })
        .levels.get('lv')!
        .card!.due.getTime();
    expect(at(0.95)).toBeLessThanOrEqual(at(0.8));
  });
  it('due list respects the daily cap minus reviews already done today', () => {
    const evs = [...study(0), test(0, 9), ...study(0, 'lv2'), test(0, 9, 'lv2')];
    const s = replay(evs, ctx);
    const later = new Date(T0 + 30 * DAY);
    expect(dueReviews(s, later, '2026-02-04', 1)).toHaveLength(1);
    expect(dueReviews(s, later, '2026-02-04', 15)).toHaveLength(2);
  });
});

describe('daily goals (03 §10)', () => {
  it('award XP once per goal per day, only when enabled', () => {
    const evs = [...study(0), ...study(0, 'lv2'), test(0, 7)];
    const off = replay(evs, ctx);
    const on = replay(evs, { ...ctx, dailyGoals: true });
    expect(on.xp - off.xp).toBe(60); // "Clear a new level"; only 6 steps studied
    const ten = replay(
      [...Array(10)].map((_, i) => ev(1, { t: 'step', level: 'other', step: `s${i}` })),
      { ...ctx, dailyGoals: true },
    );
    expect(ten.xp).toBe(50 + 50);
  });
});

describe('streaks (03 §5)', () => {
  const run = (days: string[]) => days.reduce(activity, EMPTY_STREAK);
  const seqDays = (n: number, from = '2026-01-01') => Array.from({ length: n }, (_, i) => addDays(from, i));
  it('counts consecutive days and earns a freeze every 7 (max 3)', () => {
    expect(run(seqDays(6)).current).toBe(6);
    expect(run(seqDays(7)).freezes).toBe(1);
    expect(run(seqDays(35)).freezes).toBe(3);
  });
  it('a freeze covers a missed day automatically', () => {
    const s = run([...seqDays(7), addDays('2026-01-01', 8)]);
    expect(s.current).toBe(8);
    expect(s.freezes).toBe(0);
    expect(s.frozen).toEqual(['2026-01-08']);
  });
  it('without freezes a gap starts a new streak; best is kept', () => {
    const s = run([...seqDays(3), addDays('2026-01-01', 5)]);
    expect(s.current).toBe(1);
    expect(s.best).toBe(3);
  });
  it('today is never a miss; yesterday-only activity keeps the streak', () => {
    const s = run(seqDays(3));
    expect(streakOn(s, '2026-01-04').current).toBe(3);
    expect(streakOn(s, '2026-01-06')).toMatchObject({ current: 0, broken: true, best: 3 });
  });
  it('weekly mode counts consecutive weeks meeting the target', () => {
    const days = new Set([
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-12',
      '2026-01-14',
      '2026-01-15',
      '2026-01-19',
    ]);
    expect(weeklyStreak(days, '2026-01-20', 3)).toEqual({ weeks: 2, thisWeek: 1 });
    expect(weeklyStreak(days, '2026-01-20', 1)).toEqual({ weeks: 3, thisWeek: 1 });
  });
  it('streak achievements and time-of-day badges come from replay', () => {
    const s = replay(
      seqDays(7, '2026-01-05').map((_, i) =>
        ev(i, { t: 'step', level: 'x', step: `s${i}` }, i === 0 ? 23 : i === 1 ? 5 : 12),
      ),
      ctx,
    );
    expect([...s.achievements.keys()]).toEqual(expect.arrayContaining(['streak-7', 'night-owl', 'early-bird']));
  });
});

describe('event schema', () => {
  it('validates events', () => {
    expect(EventSchema.safeParse(test(0, 5)).success).toBe(true);
    expect(EventSchema.safeParse({ t: 'test', level: 'x' }).success).toBe(false);
  });
  it('reduce reports the journal entries an event added', () => {
    const r = reduce(EMPTY_STATE, test(0, 10, 'zz', true), ctx);
    expect(r.added.map((j) => j.kind)).toEqual(expect.arrayContaining(['excellent', 'achievement', 'rank']));
  });
});

describe('bosses and world completion (03 §2, §7)', () => {
  const boss = (d: number, stage: string, correct: number) => ev(d, { t: 'boss', stage, correct, total: 10, ms: 1 });
  it('a failed boss gives nothing; beating it gives +400 +250 once', () => {
    expect(replay([boss(0, 's1', 6)], ctx).xp).toBe(0);
    const s = replay([boss(0, 's1', 6), boss(0, 's1', 8), boss(1, 's1', 10)], ctx);
    expect(s.xp).toBe(650);
    expect(s.bosses.has('s1')).toBe(true);
    expect(s.journal.filter((j) => j.kind === 'boss')).toHaveLength(1);
    expect(s.achievements.has('first-boss')).toBe(true);
  });
  it('the last stage boss of a world completes it (+1,000) exactly once', () => {
    const s = replay([boss(0, 's1', 8), boss(1, 's2', 9), boss(2, 's2', 9)], ctx);
    expect(s.worlds.has('w1')).toBe(true);
    expect(s.xp).toBe(650 * 2 + 1000);
    expect(s.journal.filter((j) => j.kind === 'world').map((j) => j.ref)).toEqual(['w1']);
    expect(s.achievements.has('island-hopper')).toBe(true);
  });
  it('named bosses award their badges', () => {
    const s = replay([boss(0, 'number-systems', 7)], ctx);
    expect(s.achievements.has('twos-complement')).toBe(true);
  });
});
