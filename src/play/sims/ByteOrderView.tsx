import { useState } from 'react';
import { clsx } from 'clsx';
import { hex2, toBytes } from '@/engine/sim/algorithms/encoding';
import { field } from './Bits';
import type { SimProps } from './registry';

/** One integer, two memory layouts: big-endian and little-endian bytes at increasing addresses. */
export function ByteOrderView({ params }: SimProps) {
  const [hex, setHex] = useState(String(params?.value ?? '01234567'));
  const [width, setWidth] = useState<2 | 4>(4);
  const v = /^[0-9a-f]{1,8}$/i.test(hex) ? parseInt(hex, 16) : NaN;
  const fits = Number.isFinite(v) && v < 2 ** (8 * width);
  const base = 0x100;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 text-[12px] font-bold text-white/70">
        <label>
          VALUE (HEX)
          <span className="mt-1 flex items-center gap-1 font-mono text-white">
            0x
            <input value={hex} onChange={(e) => setHex(e.target.value.trim())} className={`${field} w-36`} />
          </span>
        </label>
        <fieldset>
          <legend>WIDTH</legend>
          <div className="mt-1 flex gap-1">
            {([2, 4] as const).map((w) => (
              <label
                key={w}
                className={clsx(
                  'cursor-pointer rounded-lg px-3 py-1.5 font-mono text-[13px]',
                  width === w ? 'bg-teal-300 text-[#04201c]' : 'bg-white/10 text-white',
                )}
              >
                <input
                  type="radio"
                  name="width"
                  className="sr-only"
                  checked={width === w}
                  onChange={() => setWidth(w)}
                />
                {w * 8}-bit
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      {!fits ? (
        <p role="alert" className="text-[13px] text-rose-200">
          Enter a hex value that fits in {width} bytes.
        </p>
      ) : (
        (['big', 'little'] as const).map((order) => (
          <div key={order}>
            <p className="sim-label">
              {order.toUpperCase()}-ENDIAN{' '}
              {order === 'big'
                ? '(network order, most significant byte first)'
                : '(x86, ARM by default: least significant byte first)'}
            </p>
            <div className="mt-2 flex gap-1.5">
              {toBytes(v, width, order).map((b, k) => (
                <div key={k} className="w-20 rounded-xl bg-white/8 p-2 text-center">
                  <span className="block font-mono text-[10px] text-white/50">0x{(base + k).toString(16)}</span>
                  <span className="block font-mono text-[18px] font-bold text-amber-200">{hex2(b)}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
