import { describe, expect, it } from 'vitest';
import {
  addBits,
  bitString,
  decode32,
  divisionSteps,
  encode32,
  exactDecimal,
  fromBase,
  negateBits,
  otherReadings,
  placeValues,
  signedRange,
  toBase,
  toSigned,
  toTwos,
} from './numbers';

describe('positional notation', () => {
  it('converts both ways in bases 2, 8, 10, 16', () => {
    expect(toBase(2026, 2)).toBe('11111101010');
    expect(toBase(2026, 8)).toBe('3752');
    expect(toBase(2026, 16)).toBe('7EA');
    expect(toBase(0, 2)).toBe('0');
    expect(fromBase('7ea', 16)).toBe(2026);
    expect(fromBase('11111101010', 2)).toBe(2026);
    for (const n of [1, 9, 255, 4096, 65535])
      for (const b of [2, 3, 8, 16, 36]) expect(fromBase(toBase(n, b), b)).toBe(n);
  });
  it('rejects digits outside the base', () => {
    expect(() => fromBase('12', 2)).toThrow(/not a base-2 digit/);
    expect(() => toBase(5, 1)).toThrow(RangeError);
  });
  it('repeated division gives remainders least significant first', () => {
    const st = divisionSteps(13, 2);
    expect(st.map((s) => s.remainder)).toEqual([1, 0, 1, 1]);
    expect(st.at(-1)!.quotient).toBe(0);
  });
  it('place values sum to the number', () => {
    const pv = placeValues(345, 10);
    expect(pv.map((p) => p.value)).toEqual([300, 40, 5]);
    expect(placeValues(0b1011, 2).reduce((a, p) => a + p.value, 0)).toBe(11);
  });
});

describe("two's complement (CS:APP §2.2)", () => {
  it('has range [−2^(w−1), 2^(w−1) − 1]', () => {
    expect(signedRange(8)).toEqual([-128, 127]);
    expect(signedRange(32)).toEqual([-2147483648, 2147483647]);
  });
  it('reads and writes patterns', () => {
    expect(toSigned(0xff, 8)).toBe(-1);
    expect(toSigned(0x80, 8)).toBe(-128);
    expect(toSigned(0x7f, 8)).toBe(127);
    expect(toTwos(-100, 8)).toBe(0b10011100);
    expect(toTwos(-1, 32)).toBe(0xffffffff);
    expect(() => toTwos(128, 8)).toThrow(/does not fit/);
  });
  it('negates by inverting and adding one; −128 has no positive partner', () => {
    expect(toSigned(negateBits(toTwos(5, 8), 8), 8)).toBe(-5);
    expect(toSigned(negateBits(0x80, 8), 8)).toBe(-128);
    expect(negateBits(0, 8)).toBe(0);
  });
  it('compares with sign-magnitude and ones complement (two zeros there)', () => {
    expect(otherReadings(0b10000101, 8)).toEqual({ signMagnitude: -5, onesComplement: -122 });
    expect(otherReadings(0x80, 8).signMagnitude).toBe(-0);
    expect(otherReadings(0xff, 8).onesComplement).toBe(-0);
  });
  it('one adder, two meanings: carry = unsigned overflow, overflow = signed overflow', () => {
    expect(addBits(100, 50, 8)).toEqual({ sum: 150, carry: false, overflow: true }); // 100+50 = −106 signed
    expect(toSigned(addBits(100, 50, 8).sum, 8)).toBe(-106);
    expect(addBits(200, 100, 8)).toEqual({ sum: 44, carry: true, overflow: false }); // −56 + 100 = 44
    expect(addBits(toTwos(-1, 8), 1, 8)).toEqual({ sum: 0, carry: true, overflow: false });
    expect(addBits(0x80, 0x80, 8)).toEqual({ sum: 0, carry: true, overflow: true });
  });
});

describe('IEEE 754 binary32', () => {
  it('encodes textbook values', () => {
    expect(encode32(1)).toBe(0x3f800000);
    expect(encode32(-2.5)).toBe(0xc0200000);
    expect(encode32(0.1)).toBe(0x3dcccccd);
    expect(encode32(Infinity)).toBe(0x7f800000);
    expect(encode32(-0)).toBe(0x80000000);
  });
  it('decodes fields and kinds', () => {
    expect(decode32(0x3f800000)).toMatchObject({
      sign: 0,
      exponent: 127,
      fraction: 0,
      kind: 'normal',
      power: 0,
      value: 1,
    });
    expect(decode32(1)).toMatchObject({ kind: 'subnormal', power: -126, value: 2 ** -149 });
    expect(decode32(0x7f7fffff).value).toBe(3.4028234663852886e38);
    expect(decode32(0x7fc00000).kind).toBe('nan');
    expect(decode32(0xff800000)).toMatchObject({ kind: 'infinity', value: -Infinity });
  });
  it('gives the exact stored decimal (0.1 is not 0.1)', () => {
    expect(exactDecimal(0x3dcccccd)).toBe('0.100000001490116119384765625');
    expect(exactDecimal(0x3f800000)).toBe('1');
    expect(exactDecimal(0xc0200000)).toBe('-2.5');
    expect(exactDecimal(0x4b800000)).toBe('16777216'); // 2^24
    expect(exactDecimal(1)).toMatch(/^0\.0{44}1401298464324817/);
  });
  it('2^24 + 1 is the first integer binary32 cannot hold', () => {
    expect(Math.fround(16777217)).toBe(16777216);
    expect(Math.fround(16777215)).toBe(16777215);
  });
  it('formats bit strings', () => expect(bitString(5, 8)).toBe('00000101'));
});
