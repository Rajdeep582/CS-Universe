import { useEffect, useState } from 'react';
import { toBase } from '@/engine/sim/algorithms/numbers';
import { Bits, Readout, field } from './Bits';
import type { SimProps } from './registry';

/** Binary place values you can toggle; shows the same number in decimal, hex and octal. */
export function BinaryBoardView({ onGoal, params }: SimProps) {
  const width = Number(params?.bits ?? 12);
  const target = params?.target === undefined ? null : Number(params.target);
  const max = 2 ** width - 1;
  const [v, setV] = useState(0);
  const reached = target !== null && v === target;
  useEffect(() => {
    if (reached) onGoal?.();
  }, [reached, onGoal]);
  const set = (n: number) => setV(Math.max(0, Math.min(max, Math.trunc(n) || 0)));
  return (
    <div className="space-y-4">
      <Bits value={v} width={width} onChange={set} weights label={`${width} bits`} />
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Readout k="decimal" v={v.toLocaleString('en-US')} />
        <Readout k="binary" v={toBase(v, 2)} />
        <Readout k="hex" v={`0x${toBase(v, 16)}`} />
        <Readout k="octal" v={`0o${toBase(v, 8)}`} />
      </dl>
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-white/80">
        <label className="flex items-center gap-2">
          Set decimal
          <input
            type="number"
            min={0}
            max={max}
            value={v}
            onChange={(e) => set(Number(e.target.value))}
            className={`${field} w-28`}
          />
        </label>
        <button
          type="button"
          className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20"
          onClick={() => set(0)}
        >
          Clear
        </button>
        <span className="text-white/60">
          {width} bits hold 0 … {max.toLocaleString('en-US')} ({(max + 1).toLocaleString('en-US')} values)
        </span>
      </div>
      <p aria-live="polite" className="rounded-xl bg-white/6 px-3 py-2.5 text-[14px] text-white/90">
        {v === 0
          ? 'All bits are 0, so the value is 0.'
          : `${v.toLocaleString('en-US')} = ${toBase(v, 2)
              .split('')
              .map((d, i, a) => (d === '1' ? 2 ** (a.length - 1 - i) : 0))
              .filter(Boolean)
              .join(' + ')}`}
      </p>
    </div>
  );
}
