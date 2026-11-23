import { clsx } from 'clsx';

interface Props {
  /** Bit pattern (unsigned). */
  value: number;
  width: number;
  onChange: (v: number) => void;
  /** Optional colour group per bit index (0 = least significant). */
  groupOf?: (bit: number) => 'sign' | 'exp' | 'frac' | undefined;
  /** Show the place value under each bit. */
  weights?: boolean;
  label: string;
}

const GROUP = {
  sign: 'bg-rose-400/25 border-rose-300/40',
  exp: 'bg-sky-400/20 border-sky-300/40',
  frac: 'bg-amber-300/15 border-amber-200/35',
} as const;

/** A row of toggle switches, most significant bit first. Each is a real checkbox (keyboard: Tab + Space). */
export function Bits({ value, width, onChange, groupOf, weights, label }: Props) {
  return (
    <fieldset className="overflow-x-auto">
      <legend className="sr-only">{label}</legend>
      <div className="flex gap-1 pb-1">
        {Array.from({ length: width }, (_, k) => {
          const bit = width - 1 - k;
          const on = ((value >>> bit) & 1) === 1;
          const g = groupOf?.(bit);
          return (
            <label
              key={bit}
              className={clsx(
                'flex min-w-[30px] flex-1 cursor-pointer flex-col items-center rounded-lg border px-0.5 pb-1 pt-0.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal-300',
                g ? GROUP[g] : 'border-white/15 bg-white/5',
                bit % 4 === 0 && bit !== 0 && !groupOf && 'mr-1.5',
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() => onChange((value ^ (2 ** bit)) >>> 0)}
                aria-label={`bit ${bit}${weights ? ` (weight ${(2 ** bit).toLocaleString('en-US')})` : ''}`}
              />
              <span className="font-mono text-[9px] text-white/45">{bit}</span>
              <span
                className={clsx(
                  'mt-0.5 grid h-8 w-full place-items-center rounded-md font-mono text-[16px] font-bold transition-colors',
                  on ? 'bg-teal-300 text-[#04201c] shadow-[0_0_12px_rgb(45_212_191/.6)]' : 'bg-white/8 text-white/55',
                )}
              >
                {on ? 1 : 0}
              </span>
              {weights ? (
                <span className="mt-0.5 font-mono text-[9px] text-white/50">{bit > 14 ? `2^${bit}` : 2 ** bit}</span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export const Readout = ({ k, v, mono = true }: { k: string; v: string; mono?: boolean }) => (
  <div className="rounded-xl bg-white/8 px-3 py-2">
    <dt className="font-mono text-[10.5px] font-bold uppercase text-white/55">{k}</dt>
    <dd className={clsx('break-all text-[15px] font-bold text-white', mono && 'font-mono')}>{v}</dd>
  </div>
);

export const field = 'rounded-lg bg-white/90 px-2 py-1.5 font-mono text-[14px] font-bold text-[#0b2447]';
