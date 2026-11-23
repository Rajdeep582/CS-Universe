import { useEffect, useState } from 'react';
import {
  addBits,
  bitString,
  negateBits,
  otherReadings,
  signedRange,
  toSigned,
  toTwos,
} from '@/engine/sim/algorithms/numbers';
import { Bits, Readout, field } from './Bits';
import type { SimProps } from './registry';

/** One 8-bit pattern, several readings; negate; and an adder that shows carry (unsigned) vs overflow (signed). */
export function TwosComplementView({ onGoal, params }: SimProps) {
  const w = Number(params?.bits ?? 8);
  const target = params?.target === undefined ? null : Number(params.target);
  const [v, setV] = useState(toTwos(5, w));
  const [addend, setAddend] = useState(1);
  const signed = toSigned(v, w);
  const other = otherReadings(v, w);
  const [lo, hi] = signedRange(w);
  const reached = target !== null && signed === target;
  useEffect(() => {
    if (reached) onGoal?.();
  }, [reached, onGoal]);
  const add = addBits(v, toTwos(Math.max(lo, Math.min(hi, addend)), w), w);
  return (
    <div className="space-y-4">
      <Bits
        value={v}
        width={w}
        onChange={setV}
        label={`${w}-bit pattern`}
        groupOf={(b) => (b === w - 1 ? 'sign' : undefined)}
      />
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Readout k="unsigned" v={String(v)} />
        <Readout k="two's complement" v={String(signed)} />
        <Readout k="sign-magnitude" v={Object.is(other.signMagnitude, -0) ? '−0' : String(other.signMagnitude)} />
        <Readout k="one's complement" v={Object.is(other.onesComplement, -0) ? '−0' : String(other.onesComplement)} />
      </dl>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-white/85">
        <button
          type="button"
          className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20"
          onClick={() => setV(negateBits(v, w))}
        >
          Negate (invert + 1)
        </button>
        <button
          type="button"
          className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20"
          onClick={() => setV(((~v >>> 0) & (2 ** w - 1)) >>> 0)}
        >
          Invert only
        </button>
        <label className="ml-2 flex items-center gap-2">
          Set signed value
          <input
            type="number"
            min={lo}
            max={hi}
            value={signed}
            onChange={(e) => setV(toTwos(Math.max(lo, Math.min(hi, Math.trunc(Number(e.target.value)) || 0)), w))}
            className={`${field} w-24`}
          />
        </label>
      </div>
      <div className="rounded-xl bg-black/20 p-3">
        <p className="sim-label">ADDER — ONE CIRCUIT, TWO MEANINGS</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[14px] text-white">
          <span>{bitString(v, w)}</span>
          <span>+</span>
          <input
            type="number"
            min={lo}
            max={hi}
            value={addend}
            onChange={(e) => setAddend(Math.trunc(Number(e.target.value)) || 0)}
            aria-label="Value to add (signed)"
            className={`${field} w-20`}
          />
          <span>=</span>
          <span className="font-bold text-amber-200">{bitString(add.sum, w)}</span>
        </div>
        <p className="mt-2 text-[13px] text-white/85">
          Signed: {signed} + {Math.max(lo, Math.min(hi, addend))} → {toSigned(add.sum, w)}{' '}
          {add.overflow ? (
            <b className="text-rose-300">
              · OVERFLOW (true answer outside {lo}…{hi})
            </b>
          ) : (
            '· no overflow'
          )}
          <br />
          Unsigned: {v} + {toTwos(Math.max(lo, Math.min(hi, addend)), w)} → {add.sum}{' '}
          {add.carry ? <b className="text-amber-200">· carry out (unsigned wrap-around)</b> : '· no carry'}
        </p>
      </div>
      <p aria-live="polite" className="sr-only">
        Pattern {bitString(v, w)} means {signed} in two&apos;s complement.
      </p>
    </div>
  );
}
