import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { timeline } from '@/engine/sim/types';
import { ADD_PROGRAM, tinyMachine, type Cell, type MachineState } from '@/engine/sim/algorithms/tinyMachine';
import { TimelineControls, useTimeline } from './Timeline';
import type { SimProps } from './registry';

const fmt = (c: Cell | undefined) =>
  c === undefined ? '' : typeof c === 'number' ? String(c) : c.arg === undefined ? c.op : `${c.op} ${c.arg}`;
const clampInput = (v: string) => Math.max(-99, Math.min(99, Math.trunc(Number(v) || 0)));

/** Memory addresses an executing instruction reads or writes (for highlighting). */
function touched(s: MachineState): number | null {
  return s.phase === 'execute' && s.ir?.arg !== undefined ? s.ir.arg : null;
}

export function TinyMachineView({ onGoal }: SimProps) {
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);
  const states = useMemo(() => {
    const mem = [...ADD_PROGRAM];
    mem[6] = a;
    mem[7] = b;
    return timeline(tinyMachine, { memory: mem });
  }, [a, b]);
  const t = useTimeline(states.length);
  const s = states[t.i]!;
  const end = t.i === states.length - 1;
  const goal = end && s.halted && !s.error && s.output.length === 1 && s.output[0] === 10;
  useEffect(() => {
    if (goal) onGoal?.();
  }, [goal, onGoal]);
  const hot = touched(s);
  const fetching = !s.halted && s.phase === 'fetch' ? s.pc : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div>
          <p className="sim-label">MEMORY</p>
          <ol className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-9" aria-label="Memory cells">
            {s.memory.map((c, addr) => {
              const isCode = typeof c === 'object';
              const editable = addr === 6 || addr === 7;
              return (
                <li
                  key={addr}
                  className={clsx(
                    'relative rounded-xl border px-2 pb-2 pt-1.5 transition-colors',
                    isCode ? 'border-sky-300/25 bg-sky-400/10' : 'border-amber-200/25 bg-amber-300/10',
                    fetching === addr && 'ring-2 ring-teal-300',
                    hot === addr && 'ring-2 ring-amber-300',
                  )}
                >
                  <span className="block font-mono text-[10px] text-white/50">{addr}</span>
                  {editable && t.i === 0 ? (
                    <input
                      type="number"
                      min={-99}
                      max={99}
                      value={addr === 6 ? a : b}
                      onChange={(e) => (addr === 6 ? setA : setB)(clampInput(e.target.value))}
                      aria-label={`Input value at address ${addr}`}
                      className="w-full rounded-md bg-white/90 px-1 font-mono text-[14px] font-bold text-[#0b2447]"
                    />
                  ) : (
                    <span
                      className={clsx(
                        'block font-mono text-[13px] font-bold',
                        isCode ? 'text-sky-100' : 'text-amber-100',
                      )}
                    >
                      {fmt(c)}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-[12px] text-white/60">
            Blue cells hold instructions, amber cells hold data. Addresses 6 and 7 are editable at step 1.
          </p>
        </div>
        <div>
          <p className="sim-label">CPU</p>
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['PC', String(s.pc), 'Program counter'],
              ['IR', s.ir ? fmt(s.ir) : '—', 'Instruction register'],
              ['ACC', String(s.acc), 'Accumulator'],
              ['OUT', s.output.length ? s.output.join(', ') : '—', 'Output'],
            ].map(([k, v, title]) => (
              <div
                key={k}
                className="flex items-baseline justify-between rounded-xl bg-white/8 px-3 py-2"
                title={title}
              >
                <dt className="font-mono text-[11px] font-bold text-white/55">{k}</dt>
                <dd className="font-mono text-[15px] font-bold text-white">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 flex gap-1.5" aria-label="Cycle phase">
            {(['fetch', 'decode', 'execute'] as const).map((p) => (
              <span
                key={p}
                className={clsx(
                  'flex-1 rounded-full py-1 text-center text-[11px] font-bold uppercase tracking-wide',
                  !s.halted && s.phase === p ? 'bg-teal-300 text-[#04201c]' : 'bg-white/8 text-white/50',
                )}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p
        aria-live="polite"
        className={clsx(
          'min-h-[44px] rounded-xl px-3 py-2.5 text-[14px] font-medium',
          s.error ? 'bg-rose-400/15 text-rose-100' : 'bg-white/6 text-white/90',
        )}
      >
        {tinyMachine.describe(s)}
      </p>
      <TimelineControls t={t} length={states.length} label="Machine timeline" />
    </div>
  );
}
