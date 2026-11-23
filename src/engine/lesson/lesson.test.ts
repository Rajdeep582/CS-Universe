import { describe, expect, it } from 'vitest';
import { compileLesson, parseLesson } from './compile';
import { answerText, drawBoss, drawTest, gradeTest, isCorrect, seedFor, testXp, type Presented } from './testEngine';
import { SECTIONS, type Item, type StepMeta } from './schema';

const mdx =
  SECTIONS.map((s) => `<Step id="${s}-a" section="${s}" title="T ${s}">\n\nx\n\n</Step>`).join('\n') +
  '\n<Simulation id="tiny-machine" />';
const steps: StepMeta[] = SECTIONS.map((s) => ({ id: `${s}-a`, section: s, title: `T ${s}` }));
const mcq = (id: string, teaches: string): Item => ({
  id,
  teaches,
  type: 'mcq',
  prompt: 'p',
  explain: 'e',
  options: ['a', 'b', 'c'],
  answer: 2,
});
const pool: Item[] = [
  mcq('i1', 'intuition-a'),
  mcq('i2', 'intuition-a'),
  mcq('f1', 'formal-a'),
  mcq('m1', 'mechanism-a'),
  mcq('w1', 'worked-example-a'),
  mcq('w2', 'worked-example-a'),
  mcq('t1', 'tradeoffs-a'),
  mcq('p1', 'pitfalls-a'),
  mcq('p2', 'pitfalls-a'),
  { id: 'n1', teaches: 'formal-a', type: 'numeric', prompt: 'p', explain: 'e', answer: 5, tolerance: 0 },
  { id: 'o1', teaches: 'mechanism-a', type: 'order-steps', prompt: 'p', explain: 'e', steps: ['a', 'b', 'c', 'd'] },
  {
    id: 'x1',
    teaches: 'pitfalls-a',
    type: 'match',
    prompt: 'p',
    explain: 'e',
    pairs: [
      { left: 'A', right: '1' },
      { left: 'B', right: '2' },
      { left: 'C', right: '3' },
    ],
  },
];
const sims = new Set(['tiny-machine']);

describe('lesson compiler', () => {
  it('parses steps and simulations', () => {
    const p = parseLesson(mdx);
    expect(p.steps).toHaveLength(SECTIONS.length);
    expect(p.simulations).toEqual(['tiny-machine']);
  });
  it('accepts a complete lesson', () => {
    const r = compileLesson('lv', 'content/x/levels/lv/lesson.mdx', mdx, { items: pool }, sims);
    expect(r.errors).toEqual([]);
    expect(r.lesson!.steps).toEqual(steps);
  });
  it('rejects out-of-order sections, unknown sims, bad teaches, bad answers and coverage gaps', () => {
    const bad = mdx.replace('section="hook"', 'section="pitfalls"').replace('tiny-machine', 'nope');
    const items = [{ ...mcq('q', 'missing-step') }, { ...mcq('r', 'intuition-a'), answer: 9 }, mcq('s', 'context-a')];
    const r = compileLesson('lv', 'p/lesson.mdx', bad, { items }, sims);
    const all = r.errors.join('\n');
    expect(r.lesson).toBeNull();
    expect(all).toMatch(/out of order/);
    expect(all).toMatch(/unknown simulation "nope"/);
    expect(all).toMatch(/teaches unknown step "missing-step"/);
    expect(all).toMatch(/answer 9 is not an option index/);
    expect(all).toMatch(/untested section "context"/);
    expect(all).toMatch(/no item covers section "formal"/);
    expect(all).toMatch(/no step for section "hook"/);
  });
  it('rejects schema errors in test.yaml', () => {
    const r = compileLesson('lv', 'p/lesson.mdx', mdx, { items: [{ id: 'a', type: 'essay' }] }, sims);
    expect(r.errors.join()).toMatch(/test\.yaml/);
  });
});

describe('level test engine', () => {
  it('draws ≤ 10 items covering every tested section, deterministically, in lesson order', () => {
    const a = drawTest(pool, steps, 42);
    const b = drawTest(pool, steps, 42);
    expect(a.map((p) => p.item.id)).toEqual(b.map((p) => p.item.id));
    expect(a).toHaveLength(10);
    const secs = new Set(a.map((p) => steps.find((s) => s.id === p.item.teaches)!.section));
    for (const s of ['intuition', 'formal', 'mechanism', 'worked-example', 'tradeoffs', 'pitfalls'])
      expect(secs.has(s as never)).toBe(true);
    const idx = a.map((p) => steps.findIndex((s) => s.id === p.item.teaches));
    expect([...idx].sort((x, y) => x - y)).toEqual(idx);
  });
  it('varies the draw with the seed and never presents order-steps pre-solved', () => {
    const draws = new Set<string>();
    for (let k = 1; k <= 30; k++) {
      const d = drawTest(pool, steps, seedFor('lv', k));
      draws.add(d.map((p) => p.item.id).join());
      const o = d.find((p) => p.item.type === 'order-steps');
      if (o) expect(o.order).not.toEqual([0, 1, 2, 3]);
    }
    expect(draws.size).toBeGreaterThan(1);
  });
  it('uses the whole pool when it is smaller than the test size', () => {
    expect(drawTest(pool.slice(0, 8), steps, 1)).toHaveLength(8);
  });
  it('grades every format', () => {
    expect(isCorrect(pool[0]!, 2)).toBe(true);
    expect(isCorrect(pool[0]!, 1)).toBe(false);
    expect(isCorrect(pool[9]!, 5)).toBe(true);
    expect(isCorrect(pool[9]!, Number.NaN)).toBe(false);
    expect(isCorrect(pool[10]!, [0, 1, 2, 3])).toBe(true);
    expect(isCorrect(pool[10]!, [1, 0, 2, 3])).toBe(false);
    expect(isCorrect(pool[11]!, [0, 1, 2])).toBe(true);
    expect(isCorrect(pool[11]!, [0, 2, 1])).toBe(false);
    const tol: Item = {
      id: 't',
      teaches: 'formal-a',
      type: 'numeric',
      prompt: 'p',
      explain: 'e',
      answer: 3.14,
      tolerance: 0.01,
    };
    expect(isCorrect(tol, 3.15)).toBe(true);
    expect(isCorrect(tol, 3.16)).toBe(false);
    const bug: Item = {
      id: 'b',
      teaches: 'pitfalls-a',
      type: 'spot-the-bug',
      prompt: 'p',
      explain: 'e',
      language: 'asm',
      lines: ['a', 'b'],
      answer: 1,
    };
    expect(isCorrect(bug, 1)).toBe(true);
    expect(answerText(bug)).toBe('Line 2: b');
  });
  it('applies the 70 % / 90 % rules and lists steps to review', () => {
    const presented: Presented[] = Array.from({ length: 10 }, (_, i) => ({
      item: mcq(`q${i}`, i < 5 ? 'intuition-a' : 'formal-a'),
      order: [0, 1, 2],
    }));
    const answers = (right: number) => presented.map((_, i) => (i < right ? 2 : 0));
    expect(gradeTest(presented, answers(6))).toMatchObject({ passed: false, stars: 0, score: 0.6 });
    expect(gradeTest(presented, answers(7))).toMatchObject({ passed: true, stars: 1 });
    expect(gradeTest(presented, answers(9))).toMatchObject({ passed: true, stars: 2 });
    expect(gradeTest(presented, answers(4)).review).toEqual(['intuition-a', 'formal-a']);
    expect(gradeTest(presented, []).correct).toBe(0);
  });
  it('awards XP per docs/blueprint/03', () => {
    const r = (correct: number) =>
      gradeTest(
        Array.from({ length: 10 }, (_, i) => ({ item: mcq(`q${i}`, 'intuition-a'), order: [] })),
        Array.from({ length: 10 }, (_, i) => (i < correct ? 2 : 0)),
      );
    expect(testXp(r(9), 1, 0)).toBe(90 + 50 + 25);
    expect(testXp(r(7), 2, 0)).toBe(35 + 50);
    expect(testXp(r(10), 3, 1)).toBe(50 + 25);
    expect(testXp(r(5), 1, 0)).toBe(50);
  });
});

describe('boss exam draw', () => {
  const src = (levelId: string, core: boolean, n: number) => ({
    levelId,
    core,
    steps,
    pool: Array.from({ length: n }, (_, i) => mcq(`${levelId}-${i}`, 'intuition-a')),
  });
  it('covers every core level, fills to 15 and keeps stage order', () => {
    const sources = [src('a', true, 4), src('b', false, 4), src('c', true, 4), src('d', true, 4), src('e', true, 4)];
    const d = drawBoss(sources, 9);
    expect(d).toHaveLength(15);
    for (const l of ['a', 'c', 'd', 'e']) expect(d.some((p) => p.levelId === l)).toBe(true);
    const idx = d.map((p) => 'abcde'.indexOf(p.levelId));
    expect([...idx].sort((x, y) => x - y)).toEqual(idx);
    expect(new Set(d.map((p) => `${p.levelId}:${p.item.id}`)).size).toBe(15);
  });
  it('uses everything when the stage is small', () => {
    expect(drawBoss([src('a', true, 3), src('b', true, 2)], 1)).toHaveLength(5);
  });
});
