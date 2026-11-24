import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { gray, kmapLayout, minimize, termString } from '@/engine/sim/algorithms/logic';
import type { SimProps } from './registry';

type Cell = 0 | 1 | 'x';
const GROUP_COLORS = ['#fbbf24', '#38bdf8', '#f472b6', '#4ade80', '#a78bfa', '#fb923c'];
const VARS = ['A', 'B', 'C', 'D'];

/** Click cells to cycle 0 → 1 → X (don't care). The minimal groups and SOP update live. */
export function KarnaughView({ onGoal, params }: SimProps) {
  const n = Number(params?.vars ?? 4) as 3 | 4;
  const targetStr = params?.target ? String(params.target) : null;
  const target = targetStr
    ? targetStr
        .split(',')
        .map(Number)
        .sort((x, y) => x - y)
    : null;
  const [cells, setCells] = useState<Cell[]>(() => Array(2 ** n).fill(0));
  const vars = VARS.slice(0, n);
  const L = kmapLayout(n);
  const ms = cells.flatMap((c, i) => (c === 1 ? [i] : []));
  const dc = cells.flatMap((c, i) => (c === 'x' ? [i] : []));
  const cover = minimize(n, ms, dc);
  const reached = !!target && ms.join() === target.join() && dc.length === 0;
  useEffect(() => {
    if (reached) onGoal?.();
  }, [reached, onGoal]);
  const rowLabels = gray(L.rowVars).map((g) => g.toString(2).padStart(L.rowVars, '0'));
  const colLabels = gray(L.colVars).map((g) => g.toString(2).padStart(L.colVars, '0'));
  const cycle = (m: number) => setCells((c) => c.map((v, i) => (i !== m ? v : v === 0 ? 1 : v === 1 ? 'x' : 0)));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-6">
        <table className="border-separate border-spacing-1 font-mono text-[14px] text-white">
          <caption className="sr-only">Karnaugh map</caption>
          <thead>
            <tr>
              <th className="pr-2 text-right text-[11px] text-white/55">
                {vars.slice(0, L.rowVars).join('')}＼{vars.slice(L.rowVars).join('')}
              </th>
              {colLabels.map((c) => (
                <th key={c} scope="col" className="w-14 text-[12px] text-white/60">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowLabels.map((rl, r) => (
              <tr key={rl}>
                <th scope="row" className="pr-2 text-right text-[12px] text-white/60">
                  {rl}
                </th>
                {colLabels.map((_, c) => {
                  const m = L.cell(r, c);
                  const v = cells[m]!;
                  const groups = cover.map((g, k) => (g.covers.includes(m) ? k : -1)).filter((k) => k >= 0);
                  return (
                    <td key={c} className="p-0">
                      <button
                        type="button"
                        onClick={() => cycle(m)}
                        aria-label={`minterm ${m}: ${v === 'x' ? "don't care" : v}`}
                        className={clsx(
                          'relative grid h-12 w-14 place-items-center rounded-lg text-[17px] font-bold',
                          v === 1 ? 'bg-white/15' : 'bg-white/5 text-white/45',
                        )}
                        style={{
                          boxShadow:
                            groups
                              .map((k, i) => `inset 0 0 0 ${2 + i * 3}px ${GROUP_COLORS[k % GROUP_COLORS.length]}`)
                              .join(', ') || undefined,
                        }}
                      >
                        {v === 'x' ? 'X' : v}
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-normal text-white/35">{m}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="min-w-[200px] flex-1 space-y-2 text-[13px]">
          <p className="sim-label">MINIMAL SUM OF PRODUCTS</p>
          {cover.length ? (
            <ul className="space-y-1 font-mono text-[15px] font-bold">
              {cover.map((g, k) => (
                <li key={k} className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ background: GROUP_COLORS[k % GROUP_COLORS.length] }}
                    aria-hidden
                  />
                  {termString(g, vars)}{' '}
                  <span className="text-[11px] font-normal text-white/50">covers {g.covers.length} cells</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-white">F = 0</p>
          )}
          <p aria-live="polite" className="rounded-xl bg-white/6 px-3 py-2 font-mono text-[14px] text-white">
            F = {cover.length ? cover.map((g) => termString(g, vars)).join(' + ') : '0'}
          </p>
          <p className="text-[12px] text-white/60">
            Groups are rectangles of 1, 2, 4 or 8 cells; edges wrap around. Neighbouring rows and columns differ in
            exactly one bit (Gray code).
          </p>
        </div>
      </div>
      <div className="flex gap-2 text-[13px]">
        <button
          type="button"
          className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-white hover:bg-white/20"
          onClick={() => setCells(Array(2 ** n).fill(0))}
        >
          Clear
        </button>
        {target ? <span className="self-center text-white/70">Target: Σm({target.join(', ')})</span> : null}
      </div>
    </div>
  );
}
