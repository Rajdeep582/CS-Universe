import type { ReactNode } from 'react';

interface Props {
  value: number;
  color: string;
  label: string;
  size?: number;
  children?: ReactNode;
}

export function ProgressRing({ value, color, label, size = 40, children }: Props) {
  const v = Math.min(1, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className="ring flex-none"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${v * 360}deg, rgb(11 36 71 / .1) 0)`,
        color,
      }}
    >
      <span className="size-4 [&>svg]:size-full">{children}</span>
    </div>
  );
}
