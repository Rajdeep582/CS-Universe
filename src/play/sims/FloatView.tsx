import { useEffect, useState } from 'react';
import { bitString, decode32, encode32, exactDecimal } from '@/engine/sim/algorithms/numbers';
import { Bits, Readout, field } from './Bits';
import type { SimProps } from './registry';

/** IEEE 754 binary32: sign | 8-bit exponent | 23-bit fraction. Toggle bits or type a number to see what is really stored. */
export function FloatView({ onGoal, params }: SimProps) {
  const target = params?.target === undefined ? null : String(params.target);
  const [bits, setBits] = useState(encode32(1));
  const [typed, setTyped] = useState('1');
  const d = decode32(bits);
  const exact = exactDecimal(bits);
  const reached = target !== null && typed.trim() === target && encode32(Number(target)) === bits;
  useEffect(() => {
    if (reached) onGoal?.();
  }, [reached, onGoal]);
  const formula =
    d.kind === 'normal'
      ? `(−1)^${d.sign} × 1.${bitString(d.fraction, 23).replace(/0+$/, '') || '0'}₂ × 2^(${d.exponent} − 127)`
      : d.kind === 'subnormal'
        ? `(−1)^${d.sign} × 0.${bitString(d.fraction, 23).replace(/0+$/, '')}₂ × 2^−126 (subnormal: no hidden 1)`
        : d.kind === 'zero'
          ? `exponent and fraction all 0 → ${d.sign ? '−' : '+'}0`
          : d.kind === 'infinity'
            ? 'exponent all 1s, fraction 0 → infinity'
            : 'exponent all 1s, fraction ≠ 0 → NaN (not a number)';
  return (
    <div className="space-y-4">
      <Bits
        value={bits}
        width={32}
        onChange={(b) => {
          setBits(b);
          setTyped(String(decode32(b).value));
        }}
        label="32-bit pattern"
        groupOf={(b) => (b === 31 ? 'sign' : b >= 23 ? 'exp' : 'frac')}
      />
      <p className="flex gap-4 text-[11.5px] font-bold text-white/60">
        <span className="text-rose-200">■ sign (1)</span>
        <span className="text-sky-200">■ exponent (8, bias 127)</span>
        <span className="text-amber-200">■ fraction (23)</span>
      </p>
      <label className="flex flex-wrap items-center gap-2 text-[13px] text-white/85">
        Type a number
        <input
          value={typed}
          inputMode="decimal"
          onChange={(e) => {
            setTyped(e.target.value);
            const x = Number(e.target.value);
            if (e.target.value.trim() !== '' && !Number.isNaN(x)) setBits(encode32(x));
          }}
          className={`${field} w-48`}
        />
        <span className="text-white/60">→ rounded to the nearest binary32 (ties to even)</span>
      </label>
      <dl className="grid gap-2 sm:grid-cols-3">
        <Readout k="kind" v={d.kind} mono={false} />
        <Readout k="exponent field" v={`${d.exponent}${d.power !== null ? ` → 2^${d.power}` : ''}`} />
        <Readout k="hex" v={`0x${(bits >>> 0).toString(16).toUpperCase().padStart(8, '0')}`} />
      </dl>
      <dl className="grid gap-2">
        <Readout k="formula" v={formula} />
        <Readout k="exact value stored" v={exact} />
      </dl>
      {typed.trim() !== '' && Number.isFinite(Number(typed)) && Number(typed) !== d.value ? (
        <p aria-live="polite" className="rounded-xl bg-amber-300/15 px-3 py-2.5 text-[14px] text-amber-100">
          You typed {typed}, but the closest binary32 is {exact}. Rounding error:{' '}
          {(d.value - Number(typed)).toPrecision(3)}.
        </p>
      ) : (
        <p aria-live="polite" className="rounded-xl bg-white/6 px-3 py-2.5 text-[14px] text-white/90">
          {d.kind === 'normal' || d.kind === 'subnormal' || d.kind === 'zero'
            ? 'Stored exactly.'
            : d.kind === 'infinity'
              ? 'Infinity.'
              : 'Not a number.'}
        </p>
      )}
    </div>
  );
}
