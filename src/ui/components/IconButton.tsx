import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { Tooltip } from './Tooltip';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  badge?: number;
}

export function IconButton({ label, icon, badge, className, type = 'button', ...rest }: Props) {
  return (
    <Tooltip content={label}>
      <button
        type={type}
        aria-label={badge ? `${label} (${badge})` : label}
        className={clsx(
          'glass glass-interactive relative grid size-16 place-items-center rounded-[22px] text-ink',
          className,
        )}
        {...rest}
      >
        <span className="size-[26px] [&>svg]:size-full">{icon}</span>
        {badge ? (
          <span className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full border-2 border-white bg-gradient-to-b from-rose-1 to-rose-2 px-1.5 font-display text-xs font-extrabold text-white">
            {badge}
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}
