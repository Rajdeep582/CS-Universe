import { PASS, STEP_XP, STUDIED_XP, TWO_STARS } from '../lesson/testEngine';
import { daysBetween, type LearnerEvent } from './events';
import { firstCard, reviewCard, type ReviewCard } from './fsrsReview';
import { activity, EMPTY_STREAK, type Streak } from './streak';
import { rankFor } from './ranks';

export type Stars = 0 | 1 | 2 | 3;

/** XP table, docs/blueprint/03 §2. */
export const XP = {
  step: STEP_XP,
  studied: STUDIED_XP,
  simGoal: 20,
  itemFirst: 10,
  itemRetry: 5,
  cleared: 50,
  secondStar: 25,
  mastered: 75,
  review: 10,
} as const;

/** Mastery needs a passed review at least this many days after the level was first cleared. */
export const MASTERY_GAP_DAYS = 3;

export const DAILY_GOALS = [
  { id: 'study', title: 'Study 10 lesson steps', target: 10, xp: 50 },
  { id: 'clear', title: 'Clear a new level', target: 1, xp: 60 },
  { id: 'review', title: 'Pass a review', target: 1, xp: 50 },
] as const;
export type GoalId = (typeof DAILY_GOALS)[number]['id'];

export interface LevelProgress {
  seen: ReadonlySet<string>;
  studied: boolean;
  /** Level-test attempts. */
  attempts: number;
  bestScore: number;
  /** Best level-test stars (0–2); the third comes from mastery. */
  testStars: 0 | 1 | 2;
  clearedAt: number | null;
  clearedDay: string | null;
  mastered: boolean;
  /** Mastered, but the latest review failed: the third star shows as an outline. */
  masteryDim: boolean;
  card: ReviewCard | null;
  reviewsPassed: number;
  lastReviewAt: number | null;
  failedBeforeClear: boolean;
}

export type JournalKind = 'studied' | 'cleared' | 'excellent' | 'mastered' | 'rank' | 'achievement' | 'goal';
export interface JournalEntry {
  at: number;
  day: string;
  kind: JournalKind;
  levelId?: string;
  /** Rank name, achievement id or goal id. */
  ref?: string;
  xp: number;
}

export interface DayStats {
  steps: number;
  clears: number;
  reviews: number;
  goals: ReadonlySet<GoalId>;
}

export interface LearnerState {
  xp: number;
  levels: ReadonlyMap<string, LevelProgress>;
  /** Displayed stars per level (3 = mastered and not dimmed). Only levels with ≥ 1 star appear. */
  stars: ReadonlyMap<string, Stars>;
  simGoals: ReadonlySet<string>;
  reviewsPassed: number;
  streak: Streak;
  days: ReadonlyMap<string, DayStats>;
  achievements: ReadonlyMap<string, number>;
  journal: readonly JournalEntry[];
}

export interface ReplayContext {
  /** FSRS target retention (0.80–0.95). */
  retention: number;
  /** Lesson step ids of a level (from the content build). */
  stepsOf: (levelId: string) => readonly string[];
  /** Daily goals award XP only when enabled. */
  dailyGoals: boolean;
}

export const EMPTY_STATE: LearnerState = {
  xp: 0,
  levels: new Map(),
  stars: new Map(),
  simGoals: new Set(),
  reviewsPassed: 0,
  streak: EMPTY_STREAK,
  days: new Map(),
  achievements: new Map(),
  journal: [],
};

const EMPTY_LEVEL: LevelProgress = {
  seen: new Set(),
  studied: false,
  attempts: 0,
  bestScore: 0,
  testStars: 0,
  clearedAt: null,
  clearedDay: null,
  mastered: false,
  masteryDim: false,
  card: null,
  reviewsPassed: 0,
  lastReviewAt: null,
  failedBeforeClear: false,
};
const EMPTY_DAY: DayStats = { steps: 0, clears: 0, reviews: 0, goals: new Set() };

export const displayStars = (l: LevelProgress): Stars => (l.mastered && !l.masteryDim ? 3 : l.testStars);

/** Mutable working copy for one event; keeps the fold readable while the public state stays immutable. */
class Draft {
  xp: number;
  levels: Map<string, LevelProgress>;
  simGoals: ReadonlySet<string>;
  reviewsPassed: number;
  streak: Streak;
  days: Map<string, DayStats>;
  achievements: Map<string, number>;
  journal: JournalEntry[];
  added: JournalEntry[] = [];
  constructor(
    s: LearnerState,
    readonly e: LearnerEvent,
  ) {
    this.xp = s.xp;
    this.levels = new Map(s.levels);
    this.simGoals = s.simGoals;
    this.reviewsPassed = s.reviewsPassed;
    this.streak = s.streak;
    this.days = new Map(s.days);
    this.achievements = new Map(s.achievements);
    this.journal = [...s.journal];
  }
  level(id: string) {
    return this.levels.get(id) ?? EMPTY_LEVEL;
  }
  setLevel(id: string, patch: Partial<LevelProgress>) {
    this.levels.set(id, { ...this.level(id), ...patch });
  }
  day() {
    return this.days.get(this.e.day) ?? EMPTY_DAY;
  }
  bumpDay(k: 'steps' | 'clears' | 'reviews', n = 1) {
    this.days.set(this.e.day, { ...this.day(), [k]: this.day()[k] + n });
  }
  note(kind: JournalKind, xp: number, extra: { levelId?: string; ref?: string } = {}) {
    const j: JournalEntry = { at: this.e.at, day: this.e.day, kind, xp, ...extra };
    this.journal.push(j);
    this.added.push(j);
  }
  award(id: string) {
    if (this.achievements.has(id)) return;
    this.achievements.set(id, this.e.at);
    this.note('achievement', 0, { ref: id });
  }
}

function applyEvent(d: Draft, ctx: ReplayContext) {
  const e = d.e;
  const lv = d.level(e.level);
  switch (e.t) {
    case 'step': {
      if (lv.seen.has(e.step)) return;
      const seen = new Set(lv.seen).add(e.step);
      const steps = ctx.stepsOf(e.level);
      const studied = !lv.studied && steps.length > 0 && steps.every((s) => seen.has(s));
      d.xp += XP.step;
      d.bumpDay('steps');
      d.setLevel(e.level, { seen, studied: lv.studied || studied });
      if (studied) {
        d.xp += XP.studied;
        d.note('studied', XP.step + XP.studied, { levelId: e.level });
        d.award('first-light');
      }
      return;
    }
    case 'sim': {
      const key = `${e.level}:${e.sim}`;
      if (d.simGoals.has(key)) return;
      d.simGoals = new Set(d.simGoals).add(key);
      d.xp += XP.simGoal;
      d.award('hands-on');
      return;
    }
    case 'test': {
      const score = e.correct / e.total;
      const attempts = lv.attempts + 1;
      const passed = score >= PASS - 1e-9;
      const stars: 0 | 1 | 2 = !passed ? 0 : score >= TWO_STARS - 1e-9 ? 2 : 1;
      let xp = e.correct * (attempts <= 1 ? XP.itemFirst : XP.itemRetry);
      const firstClear = passed && lv.clearedAt === null;
      const firstTwo = stars === 2 && lv.testStars < 2;
      if (firstClear) xp += XP.cleared;
      if (firstTwo) xp += XP.secondStar;
      d.xp += xp;
      d.setLevel(e.level, {
        attempts,
        bestScore: Math.max(lv.bestScore, score),
        testStars: Math.max(lv.testStars, stars) as 0 | 1 | 2,
        failedBeforeClear: lv.failedBeforeClear || (!passed && lv.clearedAt === null),
        ...(firstClear ? { clearedAt: e.at, clearedDay: e.day, card: firstCard(e.at, score, ctx.retention) } : {}),
      });
      if (firstClear) {
        d.bumpDay('clears');
        d.note(firstTwo ? 'excellent' : 'cleared', xp, { levelId: e.level });
        d.award('level-up');
        if (lv.failedBeforeClear) d.award('second-wind');
        if (e.proveIt && !lv.studied) d.award('proved-it');
      } else if (firstTwo) d.note('excellent', xp, { levelId: e.level });
      if (stars === 2) d.award('sharp-mind');
      if (e.correct === e.total) d.award('flawless');
      return;
    }
    case 'review': {
      if (!lv.card || lv.clearedAt === null) return; // reviews exist only for cleared levels
      const score = e.correct / e.total;
      const passed = score >= PASS - 1e-9;
      const card = reviewCard(lv.card, e.at, score, ctx.retention);
      if (!passed) {
        d.setLevel(e.level, { card, lastReviewAt: e.at, masteryDim: lv.mastered });
        return;
      }
      const masters = !lv.mastered && daysBetween(lv.clearedDay!, e.day) >= MASTERY_GAP_DAYS;
      const xp = XP.review + (masters ? XP.mastered : 0);
      d.xp += xp;
      d.reviewsPassed++;
      d.bumpDay('reviews');
      d.setLevel(e.level, {
        card,
        lastReviewAt: e.at,
        reviewsPassed: lv.reviewsPassed + 1,
        mastered: lv.mastered || masters,
        masteryDim: false,
      });
      if (masters) {
        d.note('mastered', xp, { levelId: e.level });
        d.award('long-memory');
      }
      if (d.reviewsPassed >= 10) d.award('spaced-10');
      if (d.reviewsPassed >= 100) d.award('spaced-100');
      return;
    }
  }
}

/** One step of the fold. Returns the new state and the journal entries this event produced. */
export function reduce(
  s: LearnerState,
  e: LearnerEvent,
  ctx: ReplayContext,
): { state: LearnerState; added: JournalEntry[] } {
  const d = new Draft(s, e);
  const rankBefore = rankFor(s.xp).number;
  d.streak = activity(d.streak, e.day);
  applyEvent(d, ctx);

  if (d.streak.current >= 7) d.award('streak-7');
  if (d.streak.current >= 30) d.award('streak-30');
  if (e.hour >= 23) d.award('night-owl');
  if (e.hour < 6) d.award('early-bird');

  if (ctx.dailyGoals) {
    const day = d.day();
    const counts: Record<GoalId, number> = { study: day.steps, clear: day.clears, review: day.reviews };
    for (const g of DAILY_GOALS)
      if (!day.goals.has(g.id) && counts[g.id] >= g.target) {
        d.days.set(e.day, { ...d.day(), goals: new Set(d.day().goals).add(g.id) });
        d.xp += g.xp;
        d.note('goal', g.xp, { ref: g.id });
      }
  }

  const rank = rankFor(d.xp);
  if (rank.number > rankBefore) {
    d.note('rank', 0, { ref: rank.name });
    if (rank.number >= 3) d.award('byte-sized');
  }

  const lp = d.levels.get(e.level);
  let stars = s.stars;
  if (lp) {
    const st = displayStars(lp);
    if (st !== (s.stars.get(e.level) ?? 0)) {
      const m = new Map(s.stars);
      if (st) m.set(e.level, st);
      else m.delete(e.level);
      stars = m;
    }
  }
  return {
    state: {
      xp: d.xp,
      levels: d.levels,
      stars,
      simGoals: d.simGoals,
      reviewsPassed: d.reviewsPassed,
      streak: d.streak,
      days: d.days,
      achievements: d.achievements,
      journal: d.journal,
    },
    added: d.added,
  };
}

/** Pure replay: the same events and context always give the same state. Events are applied in time order. */
export function replay(events: readonly LearnerEvent[], ctx: ReplayContext): LearnerState {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  return sorted.reduce((s, e) => reduce(s, e, ctx).state, EMPTY_STATE);
}

/** Cleared levels whose review is due at `now`, overdue first, limited by the daily cap minus today's reviews. */
export function dueReviews(
  s: Pick<LearnerState, 'levels' | 'days'>,
  now: Date,
  today: string,
  cap: number,
): { levelId: string; due: Date }[] {
  const done = s.days.get(today)?.reviews ?? 0;
  const out: { levelId: string; due: Date }[] = [];
  for (const [levelId, l] of s.levels)
    if (l.card && l.card.due.getTime() <= now.getTime()) out.push({ levelId, due: l.card.due });
  out.sort((a, b) => a.due.getTime() - b.due.getTime() || a.levelId.localeCompare(b.levelId));
  return out.slice(0, Math.max(0, cap - done));
}

/** Next review date of a level, or null if it has no card. */
export const nextReview = (s: LearnerState, levelId: string): Date | null => s.levels.get(levelId)?.card?.due ?? null;
