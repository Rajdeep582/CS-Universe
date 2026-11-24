import { useEffect, useState } from 'react';
import { hex2 } from '@/engine/sim/algorithms/encoding';
import { field } from './Bits';
import type { SimProps } from './registry';

/** Mix a 24-bit RGB colour and size an uncompressed image. */
export function RgbView({ onGoal, params }: SimProps) {
  const target = params?.target ? String(params.target).toUpperCase() : null;
  const [rgb, setRgb] = useState<[number, number, number]>([255, 136, 0]);
  const [w, setW] = useState(1920);
  const [h, setH] = useState(1080);
  const hex = `#${rgb.map(hex2).join('')}`;
  const reached = !!target && hex === target;
  useEffect(() => {
    if (reached) onGoal?.();
  }, [reached, onGoal]);
  const bytes = w * h * 3;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-5">
        <div
          className="size-28 rounded-2xl border-4 border-white/80 shadow-lg"
          style={{ background: hex }}
          role="img"
          aria-label={`Colour ${hex}`}
        />
        <div className="min-w-[240px] flex-1 space-y-2">
          {(['Red', 'Green', 'Blue'] as const).map((name, k) => (
            <label key={name} className="flex items-center gap-3 text-[13px] text-white/85">
              <span className="w-12">{name}</span>
              <input
                type="range"
                min={0}
                max={255}
                value={rgb[k]}
                onChange={(e) =>
                  setRgb((c) => c.map((v, j) => (j === k ? Number(e.target.value) : v)) as [number, number, number])
                }
                className="sim-scrub flex-1"
              />
              <span className="w-24 font-mono">
                {rgb[k]} · 0x{hex2(rgb[k]!)}
              </span>
            </label>
          ))}
          <p className="font-mono text-[18px] font-bold text-amber-200">{hex}</p>
        </div>
      </div>
      <div className="rounded-xl bg-black/20 p-3 text-[13px] text-white/85">
        <p className="sim-label">UNCOMPRESSED IMAGE SIZE (24 BITS PER PIXEL)</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono">
          <input
            type="number"
            min={1}
            max={10000}
            value={w}
            onChange={(e) => setW(Math.max(1, Math.trunc(Number(e.target.value)) || 1))}
            aria-label="Width in pixels"
            className={`${field} w-24`}
          />
          ×
          <input
            type="number"
            min={1}
            max={10000}
            value={h}
            onChange={(e) => setH(Math.max(1, Math.trunc(Number(e.target.value)) || 1))}
            aria-label="Height in pixels"
            className={`${field} w-24`}
          />
          × 3 bytes = <b className="text-amber-200">{bytes.toLocaleString('en-US')} bytes</b> ≈{' '}
          {(bytes / 2 ** 20).toFixed(2)} MiB
        </div>
      </div>
    </div>
  );
}
