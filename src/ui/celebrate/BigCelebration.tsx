import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { GemButton } from '../components';
import { Confetti } from './Confetti';
import { useCalm } from './useCalm';

export type BigTier = 'rank' | 'stage' | 'world';

/** Each tier is larger than the one below (03 §6): size, particles, duration, backdrop. */
export const TIER_SPEC: Record<
  BigTier,
  { badge: number; particles: number; seconds: number; kind: 'burst' | 'fireworks' | 'rain'; title: string }
> = {
  rank: { badge: 200, particles: 160, seconds: 2.5, kind: 'burst', title: 'text-[44px]' },
  stage: { badge: 250, particles: 260, seconds: 5, kind: 'fireworks', title: 'text-[56px]' },
  world: { badge: 300, particles: 420, seconds: 9, kind: 'fireworks', title: 'text-[68px]' },
};

interface Props {
  tier: BigTier;
  kicker: string;
  title: string;
  text: string;
  badge: ReactNode;
  onClose: () => void;
}

/** Full-screen celebration (rank-up, stage clear, world complete). Skippable with the button or Esc. */
export function BigCelebration({ tier, kicker, title, text, badge, onClose }: Props) {
  const calm = useCalm();
  const spec = TIER_SPEC[tier];
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="big-celebration-title"
      data-tier={tier}
      className={clsx('celebrate-backdrop fixed inset-0 z-[60] grid place-items-center p-6', `celebrate-${tier}`)}
    >
      <Confetti
        count={spec.particles}
        duration={spec.seconds}
        kind={spec.kind}
        origin={[0.5, 0.4]}
        className="pointer-events-none fixed inset-0 size-full"
      />
      <motion.div
        initial={calm ? false : { scale: 0.7, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative z-10 flex max-w-[760px] flex-col items-center text-center"
      >
        <div
          className="celebrate-badge relative grid place-items-center"
          style={{ width: spec.badge, height: spec.badge }}
        >
          {!calm ? <span aria-hidden className="celebrate-rays" /> : null}
          {badge}
        </div>
        <p className="mt-6 font-display text-[13px] font-extrabold tracking-[.28em] text-gold-1">{kicker}</p>
        <h2
          id="big-celebration-title"
          className={clsx(
            'mt-1 font-display font-extrabold leading-none tracking-tight text-white drop-shadow-[0_4px_20px_rgb(0_0_0/.35)]',
            spec.title,
          )}
        >
          {title}
        </h2>
        <p className="mt-4 max-w-[520px] text-[16px] font-medium text-white/85">{text}</p>
        <GemButton ref={btn} className="mt-8" variant="gold" size="lg" onClick={onClose}>
          Continue
        </GemButton>
      </motion.div>
    </div>
  );
}
