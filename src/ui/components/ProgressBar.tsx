import { clsx } from 'clsx';

interface Props {
  /** 0..1 */
  value: number;
  label: string;
  tone?: 'xp' | 'gold' | 'mint';
  height?: number;
  className?: string;
  segments?: boolean;
}

export function ProgressBar({ value, label, tone = 'gold', height = 10, className, segments }: Props) {
  const v = Math.min(1, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={clsx('bar', `bar-${tone}`, className)}
      style={{ height }}
    >
      <i style={{ width: `${v * 100}%` }} />
      {segments ? (
        <b className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_31px,rgb(255_255_255/.5)_31px_32px)]" />
      ) : null}
    </div>
  );
}
