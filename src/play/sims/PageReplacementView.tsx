import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { simulatePaging, type Policy } from '@/engine/sim/algorithms/pageReplacement';
import { TimelineControls, useTimeline } from './Timeline';

const DEFAULT = '7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1';

function parseRefs(s: string): number[] | null {
  const parts = s
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (!parts.length || parts.length > 40) return null;
  const n = parts.map(Number);
  return n.every((x) => Number.isInteger(x) && x >= 0 && x <= 99) ? n : null;
}

/** FIFO / OPT / LRU over a reference string; frames shown in physical slots (Silberschatz OSC ch. 10). */
export function PageReplacementView() {
  const [text, setText] = useState(DEFAULT);
  const [frames, setFrames] = useState(3);
  const [policy, setPolicy] = useState<Policy>('LRU');
  const run = useMemo(() => {
    const refs = parseRefs(text);
    return refs ? simulatePaging(refs, frames, policy) : null;
  }, [text, frames, policy]);
  const t = useTimeline(run ? run.steps.length : 1);
  const field = 'rounded-lg bg-white/90 px-2 py-1.5 font-mono text-[13px] font-bold text-[#0b2447]';
  if (!run) {
    return (
      <div className="space-y-3">
        <label className="block text-[13px] text-white/80">
          Reference string
          <input value={text} onChange={(e) => setText(e.target.value)} className={clsx(field, 'mt-1 w-full')} />
        </label>
        <p role="alert" className="text-[13px] text-rose-200">
          Enter 1–40 page numbers between 0 and 99, separated by spaces.
        </p>
      </div>
    );
  }
  const shown = run.steps.slice(0, t.i + 1);
  const faultsSoFar = shown.filter((s) => s.fault).length;
  const cur = run.steps[t.i]!;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1 text-[12px] font-bold text-white/70">
          REFERENCE STRING
          <input value={text} onChange={(e) => setText(e.target.value)} className={clsx(field, 'mt-1 w-full')} />
        </label>
        <label className="text-[12px] font-bold text-white/70">
          FRAMES
          <input
            type="number"
            min={1}
            max={7}
            value={frames}
            onChange={(e) => setFrames(Math.max(1, Math.min(7, Math.trunc(Number(e.target.value)) || 1)))}
            className={clsx(field, 'mt-1 block w-16')}
          />
        </label>
        <fieldset className="text-[12px] font-bold text-white/70">
          <legend>POLICY</legend>
          <div className="mt-1 flex gap-1">
            {(['FIFO', 'LRU', 'OPT'] as const).map((p) => (
              <label
                key={p}
                className={clsx(
                  'cursor-pointer rounded-lg px-3 py-1.5 font-mono text-[13px]',
                  policy === p ? 'bg-teal-300 text-[#04201c]' : 'bg-white/10 text-white',
                )}
              >
                <input
                  type="radio"
                  name="policy"
                  value={p}
                  checked={policy === p}
                  onChange={() => setPolicy(p)}
                  className="sr-only"
                />
                {p}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="overflow-x-auto rounded-xl bg-black/20 p-3">
        <table className="border-separate border-spacing-1 font-mono text-[13px]">
          <caption className="sr-only">Frame contents after each reference</caption>
          <thead>
            <tr>
              <th scope="row" className="pr-2 text-left text-[11px] text-white/50">
                ref
              </th>
              {run.steps.map((s, k) => (
                <th
                  key={k}
                  scope="col"
                  className={clsx(
                    'w-8 rounded-md py-1 text-center',
                    k === t.i ? 'bg-teal-300 text-[#04201c]' : k < t.i ? 'text-white' : 'text-white/35',
                  )}
                >
                  {s.page}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: frames }, (_, f) => (
              <tr key={f}>
                <th scope="row" className="pr-2 text-left text-[11px] text-white/50">
                  frame {f}
                </th>
                {run.steps.map((s, k) => (
                  <td
                    key={k}
                    className={clsx(
                      'h-8 rounded-md text-center',
                      k > t.i
                        ? 'opacity-0'
                        : s.fault && s.frames[f] === s.page
                          ? 'bg-amber-300/30 font-bold text-amber-50'
                          : 'bg-white/6 text-white/80',
                    )}
                  >
                    {k <= t.i ? (s.frames[f] ?? '') : ''}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row" className="pr-2 text-left text-[11px] text-white/50">
                fault
              </th>
              {run.steps.map((s, k) => (
                <td key={k} className="text-center text-rose-300">
                  {k <= t.i && s.fault ? '●' : ''}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p aria-live="polite" className="rounded-xl bg-white/6 px-3 py-2.5 text-[14px] text-white/90">
        Reference {t.i + 1}: page {cur.page} —{' '}
        {cur.fault
          ? cur.victim === null
            ? 'fault, loaded into a free frame'
            : `fault, ${policy} evicts page ${cur.victim}`
          : 'hit'}
        . Faults so far: {faultsSoFar} of {run.faults} total.
      </p>
      <TimelineControls t={t} length={run.steps.length} label="Reference timeline" />
    </div>
  );
}
