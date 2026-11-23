/**
 * Number-representation algorithms for World 1 · Number Systems & Arithmetic.
 * References: Patterson & Hennessy, COD RISC-V 2e §2.4 and §3.5; Bryant & O'Hallaron, CS:APP 3e §2.1–2.4;
 * IEEE Std 754-2019 (binary32).
 */
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function checkBase(base: number) {
  if (!Number.isInteger(base) || base < 2 || base > 36) throw new RangeError('base must be an integer 2–36');
}

/** Non-negative integer → string in `base` (2–36). */
export function toBase(n: number, base: number): string {
  checkBase(base);
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError('n must be a non-negative safe integer');
  if (n === 0) return '0';
  let s = '';
  for (let v = n; v > 0; v = Math.floor(v / base)) s = DIGITS[v % base] + s;
  return s;
}

/** String in `base` → integer (Horner's rule). Throws on a digit that does not belong to the base. */
export function fromBase(s: string, base: number): number {
  checkBase(base);
  const t = s.trim().toUpperCase();
  if (!t) throw new RangeError('empty number');
  let v = 0;
  for (const ch of t) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) throw new RangeError(`"${ch}" is not a base-${base} digit`);
    v = v * base + d;
  }
  return v;
}

/** Repeated division by the base: each step's remainder is the next digit, least significant first. */
export function divisionSteps(n: number, base: number): { dividend: number; quotient: number; remainder: number }[] {
  checkBase(base);
  const out: { dividend: number; quotient: number; remainder: number }[] = [];
  let v = n;
  do {
    out.push({ dividend: v, quotient: Math.floor(v / base), remainder: v % base });
    v = Math.floor(v / base);
  } while (v > 0);
  return out;
}

/** Digit × weight table, most significant first. */
export function placeValues(
  n: number,
  base: number,
): { digit: string; power: number; weight: number; value: number }[] {
  const s = toBase(n, base);
  return [...s].map((digit, i) => {
    const power = s.length - 1 - i;
    const weight = base ** power;
    return { digit, power, weight, value: DIGITS.indexOf(digit) * weight };
  });
}

// ── Fixed-width integers (two's complement) ────────────────────────────────────────────────────────

const mask = (w: number) => (w === 32 ? 0xffffffff : (1 << w) - 1) >>> 0;
function checkWidth(w: number) {
  if (!Number.isInteger(w) || w < 2 || w > 32) throw new RangeError('width must be 2–32 bits');
}

/** Range of a w-bit two's-complement integer: [−2^(w−1), 2^(w−1) − 1]. */
export const signedRange = (w: number): [number, number] => [-(2 ** (w - 1)), 2 ** (w - 1) - 1];

/** Bit pattern (unsigned) → signed value under two's complement. */
export function toSigned(bits: number, w: number): number {
  checkWidth(w);
  const b = (bits >>> 0) & mask(w);
  return b >= 2 ** (w - 1) ? b - 2 ** w : b;
}

/** Signed value → w-bit two's-complement pattern (unsigned number). Throws if out of range. */
export function toTwos(value: number, w: number): number {
  checkWidth(w);
  const [lo, hi] = signedRange(w);
  if (!Number.isInteger(value) || value < lo || value > hi) throw new RangeError(`${value} does not fit in ${w} bits`);
  return (value < 0 ? value + 2 ** w : value) >>> 0;
}

/** Sign-magnitude and one's-complement readings of the same bits (for comparison). */
export function otherReadings(bits: number, w: number): { signMagnitude: number; onesComplement: number } {
  const b = (bits >>> 0) & mask(w);
  const neg = b >= 2 ** (w - 1);
  const low = b & (mask(w) >>> 1);
  return {
    signMagnitude: neg ? -low : low,
    onesComplement: neg ? -((~b >>> 0) & mask(w)) : b,
  };
}

/** Two's-complement negation: invert every bit, then add 1 (mod 2^w). */
export const negateBits = (bits: number, w: number) => ((((~bits >>> 0) & mask(w)) + 1) & mask(w)) >>> 0;

/**
 * w-bit addition as the hardware does it: one adder, two interpretations.
 * carry = unsigned overflow (carry out of the top bit); overflow = signed overflow (operands same sign, result differs).
 */
export function addBits(a: number, b: number, w: number): { sum: number; carry: boolean; overflow: boolean } {
  checkWidth(w);
  const A = (a >>> 0) & mask(w);
  const B = (b >>> 0) & mask(w);
  const full = A + B;
  const sum = full % 2 ** w;
  const top = 2 ** (w - 1);
  const sa = A >= top;
  const sb = B >= top;
  const ss = sum >= top;
  return { sum, carry: full >= 2 ** w, overflow: sa === sb && ss !== sa };
}

// ── IEEE 754 binary32 ─────────────────────────────────────────────────────────────────────────────

export type FloatKind = 'zero' | 'subnormal' | 'normal' | 'infinity' | 'nan';

export interface Decoded32 {
  bits: number;
  sign: 0 | 1;
  /** Stored (biased) exponent field, 0–255. */
  exponent: number;
  /** 23-bit fraction field. */
  fraction: number;
  kind: FloatKind;
  /** Unbiased exponent actually applied (e − 127, or −126 for subnormals). */
  power: number | null;
  value: number;
}

const view = new DataView(new ArrayBuffer(4));

/** Nearest binary32 to x (round to nearest, ties to even — what Math.fround does), as a bit pattern. */
export function encode32(x: number): number {
  view.setFloat32(0, x);
  return view.getUint32(0);
}

export function decode32(bits: number): Decoded32 {
  const b = bits >>> 0;
  view.setUint32(0, b);
  const value = view.getFloat32(0);
  const sign = (b >>> 31) as 0 | 1;
  const exponent = (b >>> 23) & 0xff;
  const fraction = b & 0x7fffff;
  const kind: FloatKind =
    exponent === 0xff ? (fraction ? 'nan' : 'infinity') : exponent === 0 ? (fraction ? 'subnormal' : 'zero') : 'normal';
  const power = kind === 'normal' ? exponent - 127 : kind === 'subnormal' ? -126 : null;
  return { bits: b, sign, exponent, fraction, kind, power, value };
}

/** The exact decimal value of a finite binary32 pattern (every binary fraction has a finite decimal expansion). */
export function exactDecimal(bits: number): string {
  const d = decode32(bits);
  if (d.kind === 'nan') return 'NaN';
  if (d.kind === 'infinity') return d.sign ? '-Infinity' : 'Infinity';
  // value = M × 2^E with integer significand M
  const M = BigInt(d.kind === 'normal' ? d.fraction | 0x800000 : d.fraction);
  const E = (d.power ?? 0) - 23;
  const sign = d.sign ? '-' : '';
  if (M === 0n) return `${sign}0`;
  if (E >= 0) return sign + (M << BigInt(E)).toString();
  // M / 2^k = M × 5^k / 10^k
  const k = -E;
  const digits = (M * 5n ** BigInt(k)).toString().padStart(k + 1, '0');
  const int = digits.slice(0, digits.length - k);
  const frac = digits.slice(digits.length - k).replace(/0+$/, '');
  return `${sign}${int}${frac ? `.${frac}` : ''}`;
}

/** Bits of a pattern as a string of width w, most significant first. */
export const bitString = (bits: number, w: number) => (bits >>> 0).toString(2).padStart(w, '0').slice(-w);
