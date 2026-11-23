import { describe, expect, it } from 'vitest';
import { EMPTY_LEARNER, reachSimGoal, recordTest, startAttempt, viewStep } from './learner';
import { newlyAvailable } from './availability';
import { curriculum } from '../content';
import type { TestResult } from '../lesson/testEngine';

const res = (correct: number, stars: 0 | 1 | 2): TestResult => ({
  correct,
  total: 10,
  score: correct / 10,
  passed: stars > 0,
  stars,
  review: [],
});

describe('learner reducers', () => {
  it('awards step XP once and the studied bonus on the last new step', () => {
    let d = viewStep(EMPTY_LEARNER, 'lv', 'a', ['a', 'b']);
    expect(d.xp).toBe(5);
    d = viewStep(d, 'lv', 'a', ['a', 'b']);
    expect(d.xp).toBe(5);
    d = viewStep(d, 'lv', 'b', ['a', 'b']);
    expect(d.xp).toBe(5 + 5 + 25);
  });
  it('awards a simulation goal once', () => {
    const d = reachSimGoal(reachSimGoal(EMPTY_LEARNER, 'lv', 'tiny-machine'), 'lv', 'tiny-machine');
    expect(d.xp).toBe(20);
  });
  it('records tests: stars never decrease, retries earn half item XP', () => {
    let d = startAttempt(EMPTY_LEARNER, 'lv');
    let r = recordTest(d, 'lv', res(9, 2));
    expect(r.xp).toBe(90 + 50 + 25);
    expect(r.data.stars.get('lv')).toBe(2);
    d = startAttempt(r.data, 'lv');
    r = recordTest(d, 'lv', res(7, 1));
    expect(r.xp).toBe(35);
    expect(r.data.stars.get('lv')).toBe(2);
  });
  it('a failed test clears nothing', () => {
    const r = recordTest(startAttempt(EMPTY_LEARNER, 'lv'), 'lv', res(6, 0));
    expect(r.data.stars.has('lv')).toBe(false);
    expect(r.xp).toBe(60);
  });
});

describe('newlyAvailable', () => {
  it('clearing the root level opens exactly its dependants that have no other blocker', () => {
    const root = curriculum.levels.find((l) => l.corePathPosition === 1)!;
    const opened = newlyAvailable(curriculum.levels, new Set(), new Set([root.id]));
    expect(opened.length).toBeGreaterThan(0);
    for (const l of opened) expect(l.requires).toEqual([root.id]);
  });
});
