import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  canonicalPOS,
  canonicalSOP,
  equivalent,
  minimize,
  minterms,
  notsOnVariables,
  operatorCount,
  operators,
  parse,
  ParseError,
  sopString,
  truthTable,
  variables,
  type Expr,
} from '@/engine/sim/algorithms/logic';
import { field } from './Bits';
import type { SimProps } from './registry';

const OP_NAMES: Record<string, string> = { not: 'NOT', and: 'AND', or: 'OR', xor: 'XOR', nand: 'NAND', nor: 'NOR' };

/** Type a Boolean expression: truth table, canonical forms, minimal SOP, and a check against a target. */
export function LogicLabView({ onGoal, params }: SimProps) {
  const target = params?.target ? String(params.target) : null;
  const only = params?.only ? String(params.only) : null;
  const forbid = params?.forbid ? String(params.forbid) : null;
  const maxOps = params?.maxOps === undefined ? null : Number(params.maxOps);
  const nnf = params?.nnf === true || params?.nnf === 'true';
  const [src, setSrc] = useState(String(params?.expr ?? "A·B + A'·C"));
  const parsed = useMemo((): { e: Expr } | { error: string } => {
    try {
      return { e: parse(src) };
    } catch (err) {
      return { error: err instanceof ParseError ? err.message : 'Invalid expression' };
    }
  }, [src]);
  const tgt = useMemo(() => (target ? parse(target) : null), [target]);
  const e = 'e' in parsed ? parsed.e : null;
  const vars = e ? [...new Set([...variables(e), ...(tgt ? variables(tgt) : [])])].sort() : [];
  const tooMany = vars.length > 4;
  const ops = e ? [...operators(e)] : [];
  const problems = e
    ? [
        only && !ops.every((o) => o === only) ? `use only ${OP_NAMES[only]}` : null,
        forbid && ops.includes(forbid) ? `do not use ${OP_NAMES[forbid]}` : null,
        maxOps !== null && operatorCount(e) > maxOps
          ? `use at most ${maxOps} operator${maxOps === 1 ? '' : 's'} (now ${operatorCount(e)})`
          : null,
        nnf && !notsOnVariables(e) ? 'apply NOT only to single variables' : null,
      ].filter((x): x is string => !!x)
    : [];
  const matches = !!e && !!tgt && equivalent(e, tgt);
  const reached = matches && problems.length === 0;
  useEffect(() => {
    if (reached) onGoal?.();
  }, [reached, onGoal]);
  const rows = e && !tooMany ? truthTable(e, vars) : [];
  const ms = e && !tooMany ? minterms(e, vars) : [];
  return (
    <div className="space-y-4">
      <label className="block text-[12px] font-bold text-white/70">
        EXPRESSION
        <input
          value={src}
          onChange={(x) => setSrc(x.target.value)}
          spellCheck={false}
          className={`${field} mt-1 block w-full`}
        />
      </label>
      <p className="text-[12px] text-white/60">
        Variables A–Z · NOT: <code>!A</code> or <code>A&apos;</code> · AND: <code>&amp;</code> <code>·</code> or{' '}
        <code>AB</code> · OR: <code>|</code> <code>+</code> · XOR: <code>^</code> · NAND: <code>↑</code> · NOR:{' '}
        <code>↓</code>
      </p>
      {'error' in parsed ? (
        <p role="alert" className="rounded-xl bg-rose-400/15 px-3 py-2 text-[13px] text-rose-100">
          {parsed.error}
        </p>
      ) : tooMany ? (
        <p className="text-[13px] text-amber-100">Use at most 4 variables here.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-[auto_1fr]">
          <table className="border-separate border-spacing-x-2 font-mono text-[13px] text-white">
            <caption className="sr-only">Truth table</caption>
            <thead>
              <tr className="text-white/55">
                {vars.map((v) => (
                  <th key={v} scope="col">
                    {v}
                  </th>
                ))}
                <th scope="col" className="text-amber-200">
                  F
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={r.out ? 'text-white' : 'text-white/45'}>
                  {r.inputs.map((b, j) => (
                    <td key={j} className="text-center">
                      {b ? 1 : 0}
                    </td>
                  ))}
                  <td className={clsx('text-center font-bold', r.out && 'text-amber-200')}>{r.out ? 1 : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="space-y-2 text-[13px]">
            {[
              ['Minterms', ms.length ? `Σm(${ms.join(', ')})` : 'none'],
              ['Canonical SOP', canonicalSOP(ms, vars)],
              ['Canonical POS', canonicalPOS(ms, vars)],
              ['Minimal SOP', sopString(minimize(vars.length, ms), vars)],
              ['Operators used', ops.length ? ops.map((o) => OP_NAMES[o]).join(', ') : 'none'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/8 px-3 py-2">
                <dt className="font-mono text-[10.5px] font-bold uppercase text-white/55">{k}</dt>
                <dd className="break-words font-mono font-bold text-white">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {tgt ? (
        <p
          aria-live="polite"
          className={clsx(
            'rounded-xl px-3 py-2.5 text-[14px]',
            reached ? 'bg-emerald-400/20 text-emerald-100' : 'bg-white/6 text-white/85',
          )}
        >
          Target: <span className="font-mono">{target}</span>
          {only ? ` · using only ${OP_NAMES[only]}` : ''} —{' '}
          {reached
            ? 'equivalent ✓'
            : matches
              ? `equivalent, but uses ${ops
                  .filter((o) => o !== only)
                  .map((o) => OP_NAMES[o])
                  .join(', ')}`
              : 'not equivalent yet'}
        </p>
      ) : null}
    </div>
  );
}
