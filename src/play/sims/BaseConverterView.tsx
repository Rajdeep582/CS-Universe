import { useEffect, useState } from 'react';
import { divisionSteps, placeValues, toBase } from '@/engine/sim/algorithms/numbers';
import { field } from './Bits';
import type { SimProps } from './registry';

const BASES = [2, 8, 10, 16] as const;

/** Decimal → any base by repeated division, and back again by place values (Horner). */
export function BaseConverterView({ onGoal, params }: SimProps) {
  const [n, setN] = useState(Number(params?.value ?? 156));
  const [base, setBase] = useState<number>(Number(params?.base ?? 2));
  const valid = Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000;
  const steps = valid ? divisionSteps(n, base) : [];
  const out = valid ? toBase(n, base) : '';
  const target = params?.target ? String(params.target) : null;
  const reached = !!target && valid && `${n}:${base}` === target;
  useEffect(() => {
    if (reached) onGoal?.();
  }, [reached, onGoal]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 text-[12px] font-bold text-white/70">
        <label>
          DECIMAL NUMBER
          <input
            type="number"
            min={0}
            max={1_000_000}
            value={n}
            onChange={(e) => setN(Math.trunc(Number(e.target.value)))}
            className={`${field} mt-1 block w-36`}
          />
        </label>
        <fieldset>
          <legend>TO BASE</legend>
          <div className="mt-1 flex gap-1">
            {BASES.map((b) => (
              <label
                key={b}
                className={`cursor-pointer rounded-lg px-3 py-1.5 font-mono text-[13px] ${base === b ? 'bg-teal-300 text-[#04201c]' : 'bg-white/10 text-white'}`}
              >
                <input type="radio" name="base" className="sr-only" checked={base === b} onChange={() => setBase(b)} />
                {b}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      {!valid ? (
        <p role="alert" className="text-[13px] text-rose-200">
          Enter a whole number from 0 to 1,000,000.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="sim-label">REPEATED DIVISION BY {base}</p>
            <table className="mt-2 w-full font-mono text-[13px] text-white">
              <thead className="text-[11px] text-white/50">
                <tr>
                  <th className="text-left font-normal">dividend</th>
                  <th className="text-left font-normal">÷ {base} =</th>
                  <th className="text-left font-normal">remainder</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((s, i) => (
                  <tr key={i}>
                    <td>{s.dividend}</td>
                    <td>{s.quotient}</td>
                    <td className="font-bold text-amber-200">{toBase(s.remainder, base)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-white/60">Read the remainders from the bottom up.</p>
          </div>
          <div>
            <p className="sim-label">CHECK WITH PLACE VALUES</p>
            <ul className="mt-2 space-y-1 font-mono text-[13px] text-white">
              {placeValues(n, base).map((p) => (
                <li key={p.power}>
                  {p.digit} × {base}^{p.power} = {p.value.toLocaleString('en-US')}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <p aria-live="polite" className="rounded-xl bg-white/6 px-3 py-2.5 font-mono text-[15px] text-white">
        {valid ? `${n} (base 10) = ${out} (base ${base})` : '—'}
      </p>
    </div>
  );
}
