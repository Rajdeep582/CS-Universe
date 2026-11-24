import { describe, expect, it } from 'vitest';
import {
  canonicalPOS,
  canonicalSOP,
  equivalent,
  evaluate,
  gray,
  kmapLayout,
  minimize,
  minterms,
  notsOnVariables,
  operatorCount,
  operators,
  parse,
  primeImplicants,
  sopString,
  truthTable,
  variables,
} from './logic';

describe('parser and evaluator', () => {
  it('respects precedence NOT > AND > XOR > OR', () => {
    const e = parse("A + B·C'");
    expect(evaluate(e, { A: false, B: true, C: false })).toBe(true);
    expect(evaluate(e, { A: false, B: true, C: true })).toBe(false);
    expect(evaluate(parse('A ^ B & C'), { A: true, B: true, C: false })).toBe(true); // A ^ (B&C)
  });
  it('accepts several notations', () => {
    for (const s of ['!(A & B)', '¬(A·B)', "(AB)'".replace('AB', 'A&B'), 'A ↑ B'])
      expect(equivalent(parse(s), parse("A' + B'"))).toBe(true);
    expect(equivalent(parse("A'B + AB'"), parse('A ^ B'))).toBe(true);
    expect(equivalent(parse("A(B + C)'"), parse('A & !(B | C)'))).toBe(true);
    expect(() => parse('A & ')).toThrow(/ended early/);
    expect(() => parse('A ) B')).toThrow(/Unexpected/);
  });
  it('lists variables and operators', () => {
    const e = parse('(C ↑ A) ↑ B');
    expect(variables(e)).toEqual(['A', 'B', 'C']);
    expect([...operators(e)]).toEqual(['nand']);
  });
});

describe('truth tables and laws', () => {
  it('builds rows in binary order', () => {
    expect(truthTable(parse('A & B')).map((r) => r.out)).toEqual([false, false, false, true]);
    expect(minterms(parse('A ^ B'))).toEqual([1, 2]);
  });
  it("verifies De Morgan's laws and absorption by truth table", () => {
    expect(equivalent(parse('!(A | B)'), parse("A'·B'"))).toBe(true);
    expect(equivalent(parse('!(A & B)'), parse("A' + B'"))).toBe(true);
    expect(equivalent(parse('A + A·B'), parse('A'))).toBe(true);
    expect(equivalent(parse('A·(A + B)'), parse('A'))).toBe(true);
    expect(equivalent(parse('A + B·C'), parse('(A + B)·(A + C)'))).toBe(true); // distributes over AND too
    expect(equivalent(parse('A + B'), parse('A & B'))).toBe(false);
  });
  it('NAND alone builds NOT, AND and OR', () => {
    expect(equivalent(parse('A ↑ A'), parse('!A'))).toBe(true);
    expect(equivalent(parse('(A ↑ B) ↑ (A ↑ B)'), parse('A & B'))).toBe(true);
    expect(equivalent(parse('(A ↑ A) ↑ (B ↑ B)'), parse('A | B'))).toBe(true);
    expect(equivalent(parse('(A ↓ B) ↓ (A ↓ B)'), parse('A | B'))).toBe(true);
  });
});

describe('normal forms and minimisation (Harris & Harris §2.7)', () => {
  const vars = ['A', 'B', 'C'];
  it('writes canonical SOP and POS', () => {
    expect(canonicalSOP([3, 5], vars)).toBe("A'BC + AB'C");
    expect(canonicalPOS([1, 2, 3, 4, 5, 6, 7], vars)).toBe('(A + B + C)');
    expect(canonicalSOP([], vars)).toBe('0');
  });
  it('majority function minimises to AB + AC + BC', () => {
    const cover = minimize(3, [3, 5, 6, 7]);
    expect(sopString(cover, vars).split(' + ').sort()).toEqual(['AB', 'AC', 'BC']);
  });
  it('uses don’t-cares and finds prime implicants', () => {
    // f(A,B,C,D) = Σm(1,3,7,11,15) + d(0,2,5): two equally small answers, CD + A'B' or CD + A'D
    const cover = minimize(4, [1, 3, 7, 11, 15], [0, 2, 5]);
    const terms = sopString(cover, ['A', 'B', 'C', 'D']).split(' + ').sort();
    expect([
      ["A'B'", 'CD'],
      ["A'D", 'CD'],
    ]).toContainEqual(terms);
    for (const m of [1, 3, 7, 11, 15]) expect(cover.some((p) => p.covers.includes(m))).toBe(true);
    for (const m of [4, 6, 8, 9, 10, 12, 13, 14]) expect(cover.some((p) => p.covers.includes(m))).toBe(false);
    expect(primeImplicants(2, [0, 1, 2, 3])).toHaveLength(1);
    expect(sopString(minimize(2, [0, 1, 2, 3]), ['A', 'B'])).toBe('1');
  });
  it('the result is always equivalent to the original function', () => {
    for (let f = 0; f < 256; f += 7) {
      const ms = Array.from({ length: 8 }, (_, i) => i).filter((i) => (f >> i) & 1);
      const s = sopString(minimize(3, ms), vars);
      const e = parse(
        s === '0'
          ? '0'
          : s.replace(/([A-Z])'/g, '!$1').replace(/([A-Z!]+)/g, (t) =>
              t
                .split(/(?=[A-Z!])/)
                .join('&')
                .replace(/!&/g, '!'),
            ),
      );
      expect(minterms(e, vars)).toEqual(ms);
    }
  });
});

describe('Karnaugh layout', () => {
  it('uses Gray code so neighbours differ in one bit', () => {
    expect(gray(2)).toEqual([0, 1, 3, 2]);
    const k = kmapLayout(4);
    expect([k.rowVars, k.colVars]).toEqual([2, 2]);
    expect(k.cell(2, 3)).toBe((3 << 2) | 2); // row 11, col 10 → m14
    expect(kmapLayout(3).cell(1, 2)).toBe(7); // A=1, BC=11
  });
});

describe('goal helpers', () => {
  it('counts operators and checks negation normal form', () => {
    expect(operatorCount(parse("A·B + A'·C"))).toBe(4);
    expect(operatorCount(parse('A'))).toBe(0);
    expect(notsOnVariables(parse("A' + B'C"))).toBe(true);
    expect(notsOnVariables(parse('!(A & B)'))).toBe(false);
  });
});
