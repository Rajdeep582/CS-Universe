import { RANKS } from '@/engine/progress/ranks';

/** The forged rank badge: rank number on a gold hex coin. */
export function RankBadge({ name, size }: { name: string; size: number }) {
  const n = RANKS.findIndex((r) => r.name === name) + 1;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Rank ${n}: ${name}`}
      className="relative"
    >
      <defs>
        <linearGradient id="rbg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6c4" />
          <stop offset=".45" stopColor="#ffcf3a" />
          <stop offset="1" stopColor="#c2620a" />
        </linearGradient>
        <linearGradient id="rbi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="1" stopColor="#e88a0c" />
        </linearGradient>
      </defs>
      <polygon points="100,8 180,54 180,146 100,192 20,146 20,54" fill="url(#rbg)" stroke="#fff" strokeWidth="6" />
      <polygon points="100,32 159,66 159,134 100,168 41,134 41,66" fill="url(#rbi)" opacity=".9" />
      <text
        x="100"
        y="122"
        textAnchor="middle"
        fontFamily="Outfit Variable, sans-serif"
        fontWeight="800"
        fontSize="64"
        fill="#7a3b00"
      >
        {n}
      </text>
    </svg>
  );
}
