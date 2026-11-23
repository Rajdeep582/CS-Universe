import { useId } from 'react';
import { clsx } from 'clsx';

function Star({ on, size, lift }: { on: boolean; size: number; lift: boolean }) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden
      className={clsx(lift && '-translate-y-1', 'drop-shadow-[0_2px_2px_rgba(120,60,0,.35)]')}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={on ? '#fff6b0' : '#e6ebf3'} />
          <stop offset=".5" stopColor={on ? '#ffc61a' : '#c5cfdf'} />
          <stop offset="1" stopColor={on ? '#f08a00' : '#a3b0c4'} />
        </linearGradient>
      </defs>
      <path
        d="M24 3.5l6.2 12.6 13.9 2-10 9.8 2.4 13.8L24 35.2 11.5 41.7l2.4-13.8-10-9.8 13.9-2z"
        fill={`url(#${id})`}
        stroke={on ? '#b45309' : '#8c99ae'}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M24 9l4.3 8.6 9.5 1.4"
        fill="none"
        stroke="#fff"
        strokeOpacity=".75"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TIER = ['not cleared yet', 'Cleared', 'Excellent', 'Mastered'] as const;

/** 0–3 stars: Cleared (test ≥ 70 %), Excellent (≥ 90 %), Mastered (review test). */
export function StarRating({ stars, size = 20 }: { stars: 0 | 1 | 2 | 3; size?: number }) {
  return (
    <span role="img" aria-label={`${stars} of 3 stars — ${TIER[stars]}`} className="inline-flex items-end gap-0.5">
      {[0, 1, 2].map((i) => (
        <Star key={i} on={i < stars} size={i === 1 ? size * 1.2 : size} lift={i === 1} />
      ))}
    </span>
  );
}
