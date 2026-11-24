import { useEffect, useState } from 'react';
import { codePoints, formatCodePoint, hex2, utf16Encode, utf8Encode } from '@/engine/sim/algorithms/encoding';
import { field } from './Bits';
import type { SimProps } from './registry';

/** Bits of a UTF-8 byte, with the length marker bits highlighted. */
function ByteBits({ b, lead }: { b: number; lead: boolean }) {
  const bits = b.toString(2).padStart(8, '0');
  const marker = !lead ? 2 : b < 0x80 ? 1 : b >= 0xf0 ? 5 : b >= 0xe0 ? 4 : 3;
  return (
    <span className="font-mono text-[12px]">
      <span className="text-rose-300">{bits.slice(0, marker)}</span>
      <span className="text-teal-200">{bits.slice(marker)}</span>
    </span>
  );
}

/** Text → code points → UTF-8 bytes and UTF-16 code units. */
export function Utf8View({ onGoal, params }: SimProps) {
  const target = params?.target ? String(params.target) : null;
  const [text, setText] = useState(String(params?.text ?? 'Hi é € 😀'));
  const cps = codePoints(text).slice(0, 24);
  const u8 = cps.flatMap(utf8Encode);
  const u16 = cps.flatMap(utf16Encode);
  const reached = !!target && text.includes(target);
  useEffect(() => {
    if (reached) onGoal?.();
  }, [reached, onGoal]);
  return (
    <div className="space-y-4">
      <label className="block text-[12px] font-bold text-white/70">
        TEXT
        <input value={text} onChange={(e) => setText(e.target.value)} className={`${field} mt-1 block w-full`} />
      </label>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-1 text-[13px] text-white">
          <thead className="text-left text-[11px] text-white/55">
            <tr>
              <th className="px-2 font-normal">char</th>
              <th className="px-2 font-normal">code point</th>
              <th className="px-2 font-normal">UTF-8 bytes</th>
              <th className="px-2 font-normal">bits (marker · payload)</th>
              <th className="px-2 font-normal">UTF-16 units</th>
            </tr>
          </thead>
          <tbody>
            {cps.map((cp, i) => {
              const b = utf8Encode(cp);
              return (
                <tr key={i} className="bg-white/5">
                  <td className="rounded-l-lg px-2 py-1 text-[16px]">{cp === 32 ? '␠' : String.fromCodePoint(cp)}</td>
                  <td className="px-2 font-mono">{formatCodePoint(cp)}</td>
                  <td className="px-2 font-mono font-bold text-amber-200">{b.map(hex2).join(' ')}</td>
                  <td className="space-x-2 px-2">
                    {b.map((x, k) => (
                      <ByteBits key={k} b={x} lead={k === 0} />
                    ))}
                  </td>
                  <td className="rounded-r-lg px-2 font-mono">
                    {utf16Encode(cp)
                      .map((u) => u.toString(16).toUpperCase().padStart(4, '0'))
                      .join(' ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p aria-live="polite" className="rounded-xl bg-white/6 px-3 py-2.5 text-[14px] text-white/90">
        {cps.length} characters (code points) → {u8.length} bytes in UTF-8, {u16.length * 2} bytes in UTF-16.
        JavaScript&apos;s <code>.length</code> says {text.length}.
      </p>
    </div>
  );
}
