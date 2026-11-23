import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { useCalm } from './useCalm';

/** Stars that stamp in one by one (level tier). `outline` marks a dimmed third star. */
export function StarStamp({
  stars,
  size = 44,
  outline = false,
  delay = 0.25,
}: {
  stars: number;
  size?: number;
  outline?: boolean;
  delay?: number;
}) {
  const calm = useCalm();
  return (
    <span role="img" aria-label={`${stars} of 3 stars`} className="inline-flex items-end gap-1.5">
      {[0, 1, 2].map((k) => {
        const on = k < stars;
        const big = k === 1;
        const s = big ? size * 1.25 : size;
        return (
          <motion.span
            key={k}
            initial={calm || !on ? false : { scale: 2.6, opacity: 0, rotate: -25 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 16, delay: delay + k * 0.32 }}
            className={clsx('grid place-items-center', big && '-translate-y-2')}
          >
            <Star
              size={s}
              strokeWidth={on ? 1.5 : 2}
              className={on ? 'star-on' : outline && k === 2 ? 'star-outline' : 'star-off'}
              fill={on ? 'url(#starGold)' : 'none'}
            />
          </motion.span>
        );
      })}
      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <linearGradient id="starGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3a8" />
            <stop offset=".45" stopColor="#ffcf3a" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}
