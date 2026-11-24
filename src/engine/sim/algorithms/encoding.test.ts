import { describe, expect, it } from 'vitest';
import {
  codePoints,
  formatCodePoint,
  fromBytes,
  huffman,
  internetChecksum,
  parityBit,
  parityOk,
  rle,
  toBytes,
  unrle,
  utf16Encode,
  utf8Decode,
  utf8Encode,
} from './encoding';

describe('UTF-8 (RFC 3629)', () => {
  it('encodes the RFC examples and each length class', () => {
    expect(utf8Encode(0x41)).toEqual([0x41]);
    expect(utf8Encode(0xe9)).toEqual([0xc3, 0xa9]); // é
    expect(utf8Encode(0x20ac)).toEqual([0xe2, 0x82, 0xac]); // €
    expect(utf8Encode(0x1f600)).toEqual([0xf0, 0x9f, 0x98, 0x80]); // 😀
    expect(utf8Encode(0x7f)).toHaveLength(1);
    expect(utf8Encode(0x80)).toHaveLength(2);
    expect(utf8Encode(0x7ff)).toHaveLength(2);
    expect(utf8Encode(0x800)).toHaveLength(3);
    expect(utf8Encode(0xffff)).toHaveLength(3);
    expect(utf8Encode(0x10ffff)).toEqual([0xf4, 0x8f, 0xbf, 0xbf]);
    expect(() => utf8Encode(0xd800)).toThrow();
    expect(() => utf8Encode(0x110000)).toThrow();
  });
  it('matches the platform encoder for mixed text', () => {
    const s = 'Hi é € 日本 😀';
    expect(codePoints(s).flatMap(utf8Encode)).toEqual([...new TextEncoder().encode(s)]);
  });
  it('decodes and rejects malformed input', () => {
    expect(utf8Decode([0xe2, 0x82, 0xac])).toEqual({ ok: true, codePoints: [0x20ac] });
    expect(utf8Decode([0x80])).toMatchObject({ ok: false, error: expect.stringMatching(/cannot start/) });
    expect(utf8Decode([0xc3])).toMatchObject({ ok: false, error: expect.stringMatching(/ends in the middle/) });
    expect(utf8Decode([0xc3, 0x41])).toMatchObject({ ok: false, error: expect.stringMatching(/continuation/) });
    expect(utf8Decode([0xc0, 0xaf])).toMatchObject({ ok: false, error: expect.stringMatching(/overlong/) });
    expect(utf8Decode([0xed, 0xa0, 0x80])).toMatchObject({ ok: false, error: expect.stringMatching(/not allowed/) });
  });
  it('UTF-16 uses surrogate pairs above U+FFFF (RFC 2781)', () => {
    expect(utf16Encode(0x20ac)).toEqual([0x20ac]);
    expect(utf16Encode(0x1f600)).toEqual([0xd83d, 0xde00]);
    expect('😀'.length).toBe(2);
    expect(formatCodePoint(0x41)).toBe('U+0041');
  });
});

describe('byte order (CS:APP §2.1.3)', () => {
  it('stores 0x01234567 big- and little-endian', () => {
    expect(toBytes(0x01234567, 4, 'big')).toEqual([0x01, 0x23, 0x45, 0x67]);
    expect(toBytes(0x01234567, 4, 'little')).toEqual([0x67, 0x45, 0x23, 0x01]);
    expect(fromBytes([0x67, 0x45, 0x23, 0x01], 'little')).toBe(0x01234567);
    expect(fromBytes([0x01, 0x00], 'little')).toBe(1);
    expect(fromBytes([0x01, 0x00], 'big')).toBe(256);
    expect(() => toBytes(256, 1, 'big')).toThrow();
  });
});

describe('integrity', () => {
  it('parity detects any single-bit error but not two', () => {
    const data = [1, 0, 1, 1, 0, 0, 1] as const;
    const word = [...data, parityBit(data, 'even')];
    expect(parityBit(data, 'even')).toBe(0);
    expect(parityBit(data, 'odd')).toBe(1);
    expect(parityOk(word, 'even')).toBe(true);
    const one = word.map((b, i) => (i === 2 ? 1 - b : b)) as (0 | 1)[];
    expect(parityOk(one, 'even')).toBe(false);
    const two = one.map((b, i) => (i === 5 ? 1 - b : b)) as (0 | 1)[];
    expect(parityOk(two, 'even')).toBe(true);
  });
  it('computes the RFC 1071 checksum and verifies to zero', () => {
    // RFC 1071 §3 example words 0001 f203 f4f5 f6f7 → sum ddf2 (after folding), checksum 220d
    const bytes = [0x00, 0x01, 0xf2, 0x03, 0xf4, 0xf5, 0xf6, 0xf7];
    expect(internetChecksum(bytes)).toBe(0x220d);
    expect(internetChecksum([...bytes, 0x22, 0x0d])).toBe(0);
  });
});

describe('compression', () => {
  it('RLE round-trips', () => {
    expect(rle('WWWWBBBW')).toEqual([
      ['W', 4],
      ['B', 3],
      ['W', 1],
    ]);
    expect(unrle(rle('aaabccdddd'))).toBe('aaabccdddd');
  });
  it('Huffman gives a prefix-free code with frequent symbols shortest', () => {
    const codes = huffman({ A: 45, B: 13, C: 12, D: 16, E: 9, F: 5 }); // CLRS §16.3 example
    const len = Object.fromEntries(Object.entries(codes).map(([k, v]) => [k, v.length]));
    expect(len).toEqual({ A: 1, B: 3, C: 3, D: 3, E: 4, F: 4 });
    const all = Object.values(codes);
    for (const a of all) for (const b of all) if (a !== b) expect(b.startsWith(a)).toBe(false);
    const freq = { A: 45, B: 13, C: 12, D: 16, E: 9, F: 5 };
    expect(Object.entries(freq).reduce((s, [k, f]) => s + f * codes[k]!.length, 0)).toBe(224); // 224 bits per 100 chars
  });
});
