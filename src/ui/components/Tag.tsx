import type { ReactNode } from 'react';
import { clsx } from 'clsx';

const TONES = {
  neutral: 'bg-[rgb(11_36_71/.07)] text-ink-2',
  gold: 'bg-gradient-to-b from-[#fff4c2] to-[#ffe08a] text-gold-4 shadow-[inset_0_0_0_1px_rgb(180_83_9/.25)]',
  rose: 'bg-gradient-to-b from-rose-1 to-rose-2 text-white',
  mint: 'bg-gradient-to-b from-[#d1fae5] to-[#a7f3d0] text-mint-3',
  lock: 'bg-[rgb(132_148_173/.16)] text-[#51627e]',
} as const;

export function Tag({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[11.5px] font-bold [&>svg]:size-3.5',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
