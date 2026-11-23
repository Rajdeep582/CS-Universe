import { hashString } from '../world/noise';
import { TESTED_SECTIONS, type Item, type StepMeta } from './schema';

/** Deterministic PRNG (mulberry32) so a test attempt can be reproduced from its seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: readonly T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** A question as presented: choice orders are shuffled; `key` maps presented positions back to the source. */
export interface Presented {
  item: Item;
  /** For mcq / predict-output: presented option i is source option order[i]. For order-steps: initial scrambled order. For match: right-column order. */
  order: number[];
}

export const TEST_SIZE = 10;
export const PASS = 0.7;
export const TWO_STARS = 0.9;

/**
 * Draws up to TEST_SIZE items: first one item for every tested section that has items (so the test
 * always covers the whole lesson), then fills the rest at random. Items are then presented in lesson order.
 */
export function drawTest(pool: readonly Item[], steps: readonly StepMeta[], seed: number): Presented[] {
  const r = rng(seed);
  const sectionOf = new Map(steps.map((s) => [s.id, s.section]));
  const stepIndex = new Map(steps.map((s, i) => [s.id, i]));
  const picked = new Set<Item>();
  for (const sec of TESTED_SECTIONS) {
    const candidates = pool.filter((i) => sectionOf.get(i.teaches) === sec);
    if (candidates.length) picked.add(candidates[Math.floor(r() * candidates.length)]!);
  }
  for (const i of shuffle(pool, r)) {
    if (picked.size >= TEST_SIZE) break;
    picked.add(i);
  }
  const ordered = [...picked].sort(
    (a, b) => stepIndex.get(a.teaches)! - stepIndex.get(b.teaches)! || pool.indexOf(a) - pool.indexOf(b),
  );
  return ordered.map((item) => ({ item, order: presentOrder(item, r) }));
}

function presentOrder(item: Item, r: () => number): number[] {
  const n =
    item.type === 'mcq' || item.type === 'predict-output'
      ? item.options.length
      : item.type === 'order-steps'
        ? item.steps.length
        : item.type === 'match'
          ? item.pairs.length
          : 0;
  if (!n) return [];
  const ids = [...Array(n).keys()];
  let o = shuffle(ids, r);
  // An order-steps question must not start already solved.
  if (item.type === 'order-steps') while (o.every((v, i) => v === i)) o = shuffle(ids, r);
  return o;
}

/**
 * Learner responses, always in SOURCE terms:
 * mcq / predict-output / spot-the-bug → chosen source index; numeric → number;
 * order-steps → source indices in the learner's order; match → for each left i, the chosen source right index.
 */
export type Response = number | number[];

export function isCorrect(item: Item, res: Response): boolean {
  switch (item.type) {
    case 'mcq':
    case 'predict-output':
    case 'spot-the-bug':
      return res === item.answer;
    case 'numeric':
      return typeof res === 'number' && Number.isFinite(res) && Math.abs(res - item.answer) <= item.tolerance + 1e-9;
    case 'order-steps':
      return Array.isArray(res) && res.length === item.steps.length && res.every((v, i) => v === i);
    case 'match':
      return Array.isArray(res) && res.length === item.pairs.length && res.every((v, i) => v === i);
  }
}

/** The correct answer in words, for feedback. */
export function answerText(item: Item): string {
  switch (item.type) {
    case 'mcq':
    case 'predict-output':
      return item.options[item.answer]!;
    case 'spot-the-bug':
      return `Line ${item.answer + 1}: ${item.lines[item.answer]!.trim()}`;
    case 'numeric':
      return item.tolerance ? `${item.answer} (± ${item.tolerance})` : String(item.answer);
    case 'order-steps':
      return item.steps.map((s, i) => `${i + 1}. ${s}`).join('  ');
    case 'match':
      return item.pairs.map((p) => `${p.left} → ${p.right}`).join(' · ');
  }
}

export interface TestResult {
  correct: number;
  total: number;
  score: number;
  passed: boolean;
  /** Stars this attempt earns: 0, 1 (≥ 70 %) or 2 (≥ 90 %). The 3rd star comes from a later review test. */
  stars: 0 | 1 | 2;
  /** Steps to revisit: the `teaches` of every missed item, deduplicated in lesson order. */
  review: string[];
}

export function gradeTest(presented: readonly Presented[], responses: readonly (Response | undefined)[]): TestResult {
  let correct = 0;
  const review: string[] = [];
  presented.forEach((p, i) => {
    const r = responses[i];
    if (r !== undefined && isCorrect(p.item, r)) correct++;
    else if (!review.includes(p.item.teaches)) review.push(p.item.teaches);
  });
  const total = presented.length;
  const score = total ? correct / total : 0;
  const passed = score >= PASS - 1e-9;
  return { correct, total, score, passed, stars: !passed ? 0 : score >= TWO_STARS - 1e-9 ? 2 : 1, review };
}

/** XP (docs/blueprint/03): 10 per item right first try, 5 on retries; +50 first clear; +25 first time reaching 2 stars. */
export function testXp(result: TestResult, attempt: number, previousStars: number): number {
  let xp = result.correct * (attempt <= 1 ? 10 : 5);
  if (result.passed && previousStars < 1) xp += 50;
  if (result.stars >= 2 && previousStars < 2) xp += 25;
  return xp;
}
export const STUDIED_XP = 25;
export const STEP_XP = 5;

export const seedFor = (levelId: string, attempt: number) => hashString(`${levelId}#${attempt}`);
