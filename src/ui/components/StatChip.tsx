import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export type TileTone = 'gold' | 'fire' | 'ice' | 'mint' | 'rose' | 'violet' | 'sky' | 'lock';

interface Props {
  icon: ReactNode;
  tone: TileTone;
  value: ReactNode;
  suffix?: ReactNode;
  label: string;
  className?: string;
}

/** HUD counter: coloured icon tile + big number + caption. */
export function StatChip({ icon, tone, value, suffix, label, className }: Props) {
  return (
    <div className={clsx('glass flex h-16 items-center gap-2.5 rounded-[22px] pl-2.5 pr-5', className)}>
      <span className={clsx('tile size-11 [&>svg]:size-6', `tile-${tone}`)} aria-hidden>
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="font-display text-[22px] font-extrabold leading-none tabular-nums">
          {value}
          {suffix ? <span className="text-sm font-bold text-muted">{suffix}</span> : null}
        </span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      </span>
    </div>
  );
}
