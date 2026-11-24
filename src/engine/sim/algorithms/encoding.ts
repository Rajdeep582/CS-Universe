/**
 * Text, byte order and integrity algorithms for World 1 · Encoding Text & Media.
 * References: The Unicode Standard ch. 2–3; RFC 3629 (UTF-8); RFC 2781 (UTF-16); RFC 1071 (Internet checksum);
 * CS:APP 3e §2.1.3 (byte ordering).
 */

export const MAX_CODE_POINT = 0x10ffff;
export const isSurrogate = (cp: number) => cp >= 0xd800 && cp <= 0xdfff;

/** UTF-8 encoding of one code point (RFC 3629): 1–4 bytes. Throws for surrogates and values beyond U+10FFFF. */
export function utf8Encode(cp: number): number[] {
  if (!Number.isInteger(cp) || cp < 0 || cp > MAX_CODE_POINT || isSurrogate(cp))
    throw new RangeError(`U+${cp.toString(16).toUpperCase()} is not a Unicode scalar value`);
  if (cp < 0x80) return [cp];
  if (cp < 0x800) return [0xc0 | (cp >> 6), 0x80 | (cp & 0x3f)];
  if (cp < 0x10000) return [0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f)];
  return [0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f)];
}

export type Utf8Result =
  { ok: true; codePoints: number[] } | { ok: false; codePoints: number[]; error: string; at: number };

/** Strict UTF-8 decoder: rejects bad lead bytes, missing continuations, overlong forms, surrogates and > U+10FFFF. */
export function utf8Decode(bytes: readonly number[]): Utf8Result {
  const out: number[] = [];
  let i = 0;
  const bad = (error: string): Utf8Result => ({ ok: false, codePoints: out, error, at: i });
  while (i < bytes.length) {
    const b0 = bytes[i]!;
    let need: number;
    let cp: number;
    let min: number;
    if (b0 < 0x80) {
      out.push(b0);
      i++;
      continue;
    } else if ((b0 & 0xe0) === 0xc0) [need, cp, min] = [1, b0 & 0x1f, 0x80];
    else if ((b0 & 0xf0) === 0xe0) [need, cp, min] = [2, b0 & 0x0f, 0x800];
    else if ((b0 & 0xf8) === 0xf0) [need, cp, min] = [3, b0 & 0x07, 0x10000];
    else return bad(`byte 0x${hex2(b0)} cannot start a character`);
    for (let k = 1; k <= need; k++) {
      const b = bytes[i + k];
      if (b === undefined) return bad('text ends in the middle of a character');
      if ((b & 0xc0) !== 0x80) return bad(`byte 0x${hex2(b)} should be a continuation byte (10xxxxxx)`);
      cp = (cp << 6) | (b & 0x3f);
    }
    if (cp < min) return bad('overlong encoding (a shorter form exists)');
    if (isSurrogate(cp) || cp > MAX_CODE_POINT)
      return bad(`U+${cp.toString(16).toUpperCase()} is not allowed in UTF-8`);
    out.push(cp);
    i += need + 1;
  }
  return { ok: true, codePoints: out };
}

/** UTF-16 code units (RFC 2781): one unit below U+10000, otherwise a surrogate pair. */
export function utf16Encode(cp: number): number[] {
  if (cp < 0 || cp > MAX_CODE_POINT || isSurrogate(cp)) throw new RangeError('not a Unicode scalar value');
  if (cp < 0x10000) return [cp];
  const v = cp - 0x10000;
  return [0xd800 | (v >> 10), 0xdc00 | (v & 0x3ff)];
}

/** Code points of a JS string (iterates by code point, not UTF-16 unit). */
export const codePoints = (s: string) => [...s].map((c) => c.codePointAt(0)!);

export const formatCodePoint = (cp: number) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
export const hex2 = (b: number) => b.toString(16).toUpperCase().padStart(2, '0');

// ── Byte order ────────────────────────────────────────────────────────────────

/** Bytes of an unsigned integer of `width` bytes, in memory order for the given endianness. */
export function toBytes(value: number, width: 1 | 2 | 4, order: 'big' | 'little'): number[] {
  if (!Number.isInteger(value) || value < 0 || value >= 2 ** (8 * width))
    throw new RangeError(`${value} does not fit in ${width} bytes`);
  const big = Array.from({ length: width }, (_, k) => Math.floor(value / 2 ** (8 * (width - 1 - k))) % 256);
  return order === 'big' ? big : big.reverse();
}
export function fromBytes(bytes: readonly number[], order: 'big' | 'little'): number {
  const b = order === 'big' ? bytes : [...bytes].reverse();
  return b.reduce((v, x) => v * 256 + x, 0);
}

// ── Integrity ─────────────────────────────────────────────────────────────────

export const popcount = (bits: readonly (0 | 1)[]) => bits.reduce<number>((a, b) => a + b, 0);

/** Parity bit to append so the total number of 1s is even (or odd). */
export const parityBit = (bits: readonly (0 | 1)[], kind: 'even' | 'odd'): 0 | 1 =>
  ((popcount(bits) % 2) ^ (kind === 'odd' ? 1 : 0)) as 0 | 1;
/** Does a word (data + parity) pass the check? */
export const parityOk = (word: readonly (0 | 1)[], kind: 'even' | 'odd') =>
  popcount(word) % 2 === (kind === 'even' ? 0 : 1);

/** RFC 1071 Internet checksum: one's-complement of the one's-complement sum of 16-bit big-endian words. */
export function internetChecksum(bytes: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 2) sum += (bytes[i]! << 8) | (bytes[i + 1] ?? 0);
  while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
  return ~sum & 0xffff;
}

// ── Compression ──────────────────────────────────────────────────────────────

/** Run-length encoding as [symbol, count] pairs. */
export function rle(s: string): [string, number][] {
  const out: [string, number][] = [];
  for (const ch of s) {
    const last = out[out.length - 1];
    if (last && last[0] === ch) last[1]++;
    else out.push([ch, 1]);
  }
  return out;
}
export const unrle = (runs: readonly [string, number][]) => runs.map(([c, n]) => c.repeat(n)).join('');

/** Huffman code lengths and codes (ties broken by symbol for determinism). */
export function huffman(freq: Readonly<Record<string, number>>): Record<string, string> {
  type Node = { w: number; sym?: string; l?: Node; r?: Node; key: string };
  let q: Node[] = Object.entries(freq)
    .filter(([, w]) => w > 0)
    .map(([sym, w]) => ({ w, sym, key: sym }));
  if (q.length === 1) return { [q[0]!.sym!]: '0' };
  const cmp = (a: Node, b: Node) => a.w - b.w || (a.key < b.key ? -1 : 1);
  while (q.length > 1) {
    q.sort(cmp);
    const [a, b] = [q[0]!, q[1]!];
    q = [...q.slice(2), { w: a.w + b.w, l: a, r: b, key: a.key + b.key }];
  }
  const codes: Record<string, string> = {};
  const walk = (n: Node, p: string): void => {
    if (n.sym !== undefined) codes[n.sym] = p;
    else {
      walk(n.l!, `${p}0`);
      walk(n.r!, `${p}1`);
    }
  };
  walk(q[0]!, '');
  return codes;
}
