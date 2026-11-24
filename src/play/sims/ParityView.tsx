import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { parityBit, parityOk } from '@/engine/sim/algorithms/encoding';
import type { SimProps } from './registry';

type B = 0 | 1;

/** Send 7 data bits with a parity bit, flip bits "in transit", and see whether the receiver notices. */
export function ParityView({ onGoal }: SimProps) {
  const [data, setData] = useState<B[]>([1, 0, 1, 1, 0, 0, 1]);
  const [kind, setKind] = useState<'even' | 'odd'>('even');
  const [flips, setFlips] = useState<Set<number>>(new Set());
  const sent: B[] = [...data, parityBit(data, kind)];
  const received = sent.map((b, i) => (flips.has(i) ? ((1 - b) as B) : b));
  const ok = parityOk(received, kind);
  const undetected = flips.size > 0 && ok;
  useEffect(() => {
    if (undetected) onGoal?.();
  }, [undetected, onGoal]);
  const row = (bits: B[], onClick: (i: number) => void, label: string, hot?: (i: number) => boolean) => (
    <div>
      <p className="sim-label">{label}</p>
      <div className="mt-1.5 flex gap-1">
        {bits.map((b, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onClick(i)}
            aria-label={`${label} bit ${i + 1}${i === 7 ? ' (parity)' : ''}: ${b}`}
            className={clsx(
              'grid h-11 w-11 place-items-center rounded-lg font-mono text-[17px] font-bold',
              i === 7 ? 'ring-1 ring-amber-200/60' : '',
              hot?.(i) ? 'bg-rose-400/70 text-white' : b ? 'bg-teal-300 text-[#04201c]' : 'bg-white/8 text-white/60',
            )}
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-[13px] text-white/85">
        Parity:
        {(['even', 'odd'] as const).map((k) => (
          <label
            key={k}
            className={clsx(
              'cursor-pointer rounded-lg px-3 py-1 font-semibold',
              kind === k ? 'bg-teal-300 text-[#04201c]' : 'bg-white/10',
            )}
          >
            <input type="radio" name="parity" className="sr-only" checked={kind === k} onChange={() => setKind(k)} />
            {k}
          </label>
        ))}
      </div>
      {row(
        sent,
        (i) => i < 7 && setData(data.map((b, j) => (j === i ? ((1 - b) as B) : b))),
        'SENT (click a data bit to change it)',
      )}
      {row(
        received,
        (i) =>
          setFlips((f) => {
            const n = new Set(f);
            if (n.has(i)) n.delete(i);
            else n.add(i);
            return n;
          }),
        'RECEIVED (click to flip a bit in transit)',
        (i) => flips.has(i),
      )}
      <p
        aria-live="polite"
        className={clsx(
          'rounded-xl px-3 py-2.5 text-[14px]',
          !flips.size
            ? 'bg-white/6 text-white/90'
            : ok
              ? 'bg-amber-300/20 text-amber-100'
              : 'bg-emerald-400/20 text-emerald-100',
        )}
      >
        {!flips.size
          ? `No errors. The word has ${received.filter(Boolean).length} ones — ${kind} parity holds.`
          : ok
            ? `${flips.size} bits flipped, but the parity still checks — this error goes UNDETECTED.`
            : `${flips.size} bit${flips.size > 1 ? 's' : ''} flipped — parity fails, error DETECTED (but we cannot tell which bit).`}
      </p>
    </div>
  );
}
