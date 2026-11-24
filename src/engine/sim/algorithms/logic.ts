/**
 * Boolean logic for World 1 · Boolean Logic.
 * Expressions use variables A–Z, constants 0/1, NOT (! ¬ ~ or postfix '), AND (& · * or juxtaposition: AB), XOR (^ ⊕), OR (| +),
 * NAND (↑) and NOR (↓), with precedence NOT > AND/NAND > XOR > OR/NOR (left-associative).
 * Minimisation: Quine–McCluskey prime implicants + exact minimum cover (fine for ≤ 6 variables).
 * References: Harris & Harris, DDCA RISC-V ed., ch. 2; Quine (1952), McCluskey (1956).
 */
export type Expr =
  | { k: 'var'; name: string }
  | { k: 'const'; v: boolean }
  | { k: 'not'; a: Expr }
  | { k: 'and' | 'or' | 'xor' | 'nand' | 'nor'; a: Expr; b: Expr };

export class ParseError extends Error {}

const OPS: Record<string, 'and' | 'or' | 'xor' | 'nand' | 'nor'> = {
  '&': 'and',
  '·': 'and',
  '*': 'and',
  '|': 'or',
  '+': 'or',
  '^': 'xor',
  '⊕': 'xor',
  '↑': 'nand',
  '↓': 'nor',
};
const NOTS = new Set(['!', '¬', '~']);

export function parse(src: string): Expr {
  const s = src.replace(/\s+/g, '');
  let i = 0;
  const peek = () => s[i];
  const fail = (msg: string): never => {
    throw new ParseError(`${msg} at position ${i + 1}`);
  };
  // Levels: or/nor < xor < and/nand < unary
  const level = (ops: string[], next: () => Expr) => (): Expr => {
    let left = next();
    while (i < s.length && ops.includes(OPS[peek()!] ?? '')) {
      const op = OPS[s[i++]!]!;
      left = { k: op, a: left, b: next() } as Expr;
    }
    return left;
  };
  const atom = (): Expr => {
    const c = peek();
    if (c === undefined) return fail('Expression ended early');
    let e: Expr;
    if (NOTS.has(c)) {
      i++;
      e = { k: 'not', a: atom() };
    } else if (c === '(') {
      i++;
      e = or();
      if (peek() !== ')') fail('Missing )');
      i++;
    } else if (/[A-Za-z]/.test(c)) {
      i++;
      e = { k: 'var', name: c.toUpperCase() };
    } else if (c === '0' || c === '1') {
      i++;
      e = { k: 'const', v: c === '1' };
    } else return fail(`Unexpected "${c}"`);
    while (peek() === "'" || peek() === '’') {
      i++;
      e = { k: 'not', a: e };
    }
    return e;
  };
  // AND level also accepts juxtaposition: "AB" and "A'(B+C)" mean A·B and A'·(B+C).
  const startsAtom = (c: string | undefined) => c !== undefined && (/[A-Za-z01(]/.test(c) || NOTS.has(c));
  const and = (): Expr => {
    let left = atom();
    for (;;) {
      const op = OPS[peek() ?? ''];
      if (op === 'and' || op === 'nand') {
        i++;
        left = { k: op, a: left, b: atom() };
      } else if (startsAtom(peek())) left = { k: 'and', a: left, b: atom() };
      else return left;
    }
  };
  const xor = level(['xor'], and);
  const or: () => Expr = level(['or', 'nor'], xor);
  const e = or();
  if (i < s.length) fail(`Unexpected "${s[i]}"`);
  return e;
}

export function evaluate(e: Expr, env: Readonly<Record<string, boolean>>): boolean {
  switch (e.k) {
    case 'var':
      return env[e.name] ?? false;
    case 'const':
      return e.v;
    case 'not':
      return !evaluate(e.a, env);
    case 'and':
      return evaluate(e.a, env) && evaluate(e.b, env);
    case 'or':
      return evaluate(e.a, env) || evaluate(e.b, env);
    case 'xor':
      return evaluate(e.a, env) !== evaluate(e.b, env);
    case 'nand':
      return !(evaluate(e.a, env) && evaluate(e.b, env));
    case 'nor':
      return !(evaluate(e.a, env) || evaluate(e.b, env));
  }
}

export function variables(e: Expr, out = new Set<string>()): string[] {
  if (e.k === 'var') out.add(e.name);
  else if (e.k === 'not') variables(e.a, out);
  else if (e.k !== 'const') {
    variables(e.a, out);
    variables(e.b, out);
  }
  return [...out].sort();
}

/** Operators used (for "NAND only" style goals). */
export function operators(e: Expr, out = new Set<string>()): Set<string> {
  if (e.k === 'not') {
    out.add('not');
    operators(e.a, out);
  } else if (e.k !== 'var' && e.k !== 'const') {
    out.add(e.k);
    operators(e.a, out);
    operators(e.b, out);
  }
  return out;
}

/** Truth table rows in binary order of the variables (first variable = most significant). */
export function truthTable(e: Expr, vars = variables(e)): { inputs: boolean[]; out: boolean }[] {
  const n = vars.length;
  return Array.from({ length: 2 ** n }, (_, m) => {
    const inputs = vars.map((_, j) => ((m >> (n - 1 - j)) & 1) === 1);
    const env = Object.fromEntries(vars.map((v, j) => [v, inputs[j]!]));
    return { inputs, out: evaluate(e, env) };
  });
}

export const minterms = (e: Expr, vars = variables(e)) =>
  truthTable(e, vars)
    .map((r, m) => (r.out ? m : -1))
    .filter((m) => m >= 0);

/** Do two expressions agree on every input (over the union of their variables)? */
export function equivalent(a: Expr, b: Expr): boolean {
  const vars = [...new Set([...variables(a), ...variables(b)])].sort();
  const ta = truthTable(a, vars);
  const tb = truthTable(b, vars);
  return ta.every((r, i) => r.out === tb[i]!.out);
}

const lit = (v: string, pos: boolean) => (pos ? v : `${v}'`);

/** Canonical sum of products (one minterm per true row) and product of sums (one maxterm per false row). */
export function canonicalSOP(ms: readonly number[], vars: readonly string[]): string {
  if (!ms.length) return '0';
  const n = vars.length;
  return ms.map((m) => vars.map((v, j) => lit(v, ((m >> (n - 1 - j)) & 1) === 1)).join('')).join(' + ');
}
export function canonicalPOS(ms: readonly number[], vars: readonly string[]): string {
  const n = vars.length;
  const zeros = Array.from({ length: 2 ** n }, (_, i) => i).filter((i) => !ms.includes(i));
  if (!zeros.length) return '1';
  return zeros.map((m) => `(${vars.map((v, j) => lit(v, ((m >> (n - 1 - j)) & 1) === 0)).join(' + ')})`).join('');
}

/** An implicant: `bits` over n variables with `mask` marking don't-care positions (1 = eliminated). */
export interface Implicant {
  bits: number;
  mask: number;
  covers: number[];
}

/** Quine–McCluskey: all prime implicants of (minterms ∪ don't-cares). */
export function primeImplicants(n: number, ms: readonly number[], dc: readonly number[] = []): Implicant[] {
  let level: Implicant[] = [...new Set([...ms, ...dc])].map((m) => ({ bits: m, mask: 0, covers: [m] }));
  const primes: Implicant[] = [];
  const key = (x: Implicant) => `${x.bits}/${x.mask}`;
  while (level.length) {
    const used = new Set<string>();
    const next = new Map<string, Implicant>();
    for (let i = 0; i < level.length; i++)
      for (let j = i + 1; j < level.length; j++) {
        const a = level[i]!;
        const b = level[j]!;
        if (a.mask !== b.mask) continue;
        const diff = a.bits ^ b.bits;
        if (diff && (diff & (diff - 1)) === 0) {
          const c: Implicant = {
            bits: a.bits & ~diff,
            mask: a.mask | diff,
            covers: [...new Set([...a.covers, ...b.covers])].sort((x, y) => x - y),
          };
          next.set(key(c), c);
          used.add(key(a));
          used.add(key(b));
        }
      }
    for (const x of level) if (!used.has(key(x)) && !primes.some((p) => key(p) === key(x))) primes.push(x);
    level = [...next.values()];
  }
  void n;
  return primes;
}

/** Minimum-size cover (fewest implicants, then fewest literals) of the minterms by prime implicants. */
export function minimize(n: number, ms: readonly number[], dc: readonly number[] = []): Implicant[] {
  if (!ms.length) return [];
  const primes = primeImplicants(n, ms, dc).filter((p) => p.covers.some((m) => ms.includes(m)));
  const literals = (p: Implicant) => n - popcount(p.mask);
  let best: Implicant[] | null = null;
  const cost = (s: Implicant[]) => s.length * 1000 + s.reduce((a, p) => a + literals(p), 0);
  // Exact search by increasing cover size (primes are few for ≤ 6 variables).
  const sorted = [...primes].sort((a, b) => literals(a) - literals(b));
  const search = (start: number, chosen: Implicant[], k: number) => {
    if (chosen.length === k) {
      if (ms.every((m) => chosen.some((p) => p.covers.includes(m))) && (!best || cost(chosen) < cost(best)))
        best = [...chosen];
      return;
    }
    for (let i = start; i < sorted.length; i++) {
      chosen.push(sorted[i]!);
      search(i + 1, chosen, k);
      chosen.pop();
    }
  };
  for (let k = 1; k <= sorted.length && !best; k++) search(0, [], k);
  return best ?? sorted;
}

function popcount(x: number) {
  let c = 0;
  for (let v = x; v; v &= v - 1) c++;
  return c;
}

/** Product term for an implicant, e.g. A'C (or "1" if every variable is eliminated). */
export function termString(p: Implicant, vars: readonly string[]): string {
  const n = vars.length;
  const t = vars
    .map((v, j) => {
      const bit = 1 << (n - 1 - j);
      return p.mask & bit ? '' : lit(v, (p.bits & bit) !== 0);
    })
    .join('');
  return t || '1';
}

export const sopString = (cover: readonly Implicant[], vars: readonly string[]) =>
  cover.length ? cover.map((p) => termString(p, vars)).join(' + ') : '0';

/** Gray-code order used on Karnaugh-map axes: 00, 01, 11, 10. */
export const gray = (bits: number) => Array.from({ length: 2 ** bits }, (_, i) => i ^ (i >> 1));

/** Karnaugh-map layout for 2–4 variables: rows use the first variables, columns the rest, both in Gray order. */
export function kmapLayout(n: number): { rowVars: number; colVars: number; cell: (r: number, c: number) => number } {
  if (n < 2 || n > 4) throw new RangeError('Karnaugh maps here support 2–4 variables');
  const rowVars = Math.floor(n / 2);
  const colVars = n - rowVars;
  const rg = gray(rowVars);
  const cg = gray(colVars);
  return { rowVars, colVars, cell: (r, c) => (rg[r]! << colVars) | cg[c]! };
}

/** Number of operator nodes (each NOT and each binary operator counts once). */
export function operatorCount(e: Expr): number {
  if (e.k === 'var' || e.k === 'const') return 0;
  if (e.k === 'not') return 1 + operatorCount(e.a);
  return 1 + operatorCount(e.a) + operatorCount(e.b);
}

/** True when NOT is applied only directly to variables (negation normal form). */
export function notsOnVariables(e: Expr): boolean {
  if (e.k === 'var' || e.k === 'const') return true;
  if (e.k === 'not') return e.a.k === 'var';
  return notsOnVariables(e.a) && notsOnVariables(e.b);
}
