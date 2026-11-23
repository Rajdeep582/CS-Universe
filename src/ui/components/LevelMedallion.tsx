import { Lock, Gift, Repeat } from 'lucide-react';
import { clsx } from 'clsx';

export type MedalState = 'locked' | 'available' | 'current' | 'cleared';

interface Props {
  state: MedalState;
  /** Road number, or null for a bonus level. */
  number: number | null;
  size?: number;
  /** Lesson progress 0..1 for an unfinished level (drawn as a ring). */
  progress?: number;
  /** Spaced review is due. */
  due?: boolean;
  /** ★★★ — the medallion gets the mastered finish. */
  mastered?: boolean;
}

const LABEL: Record<MedalState, string> = {
  locked: 'locked',
  available: 'available',
  current: 'up next',
  cleared: 'cleared',
};

export function LevelMedallion({ state, number, size = 48, progress, due, mastered }: Props) {
  const bonus = number === null;
  const ring = state !== 'cleared' && state !== 'locked' && progress !== undefined && progress > 0;
  const label = [
    bonus ? 'Bonus level' : `Level ${number}`,
    mastered ? 'mastered' : LABEL[state],
    ring ? `${Math.round(progress! * 100)} % studied` : null,
    due ? 'review due' : null,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <span
      role="img"
      aria-label={label}
      className={clsx('medal', `medal-${state}`, bonus && 'medal-bonus', mastered && 'medal-mastered')}
      style={{ width: size, height: size, fontSize: size * 0.44 }}
    >
      {ring ? (
        <i
          aria-hidden
          className="medal-progress"
          style={{ background: `conic-gradient(var(--color-mint-2) ${progress! * 360}deg, rgb(255 255 255 / .55) 0)` }}
        />
      ) : null}
      {state === 'locked' ? (
        <Lock size={size * 0.4} strokeWidth={2.6} />
      ) : bonus ? (
        <Gift size={size * 0.44} strokeWidth={2.4} />
      ) : (
        number
      )}
      {due ? (
        <b aria-hidden className="medal-due" style={{ width: size * 0.42, height: size * 0.42 }}>
          <Repeat size={size * 0.24} strokeWidth={3} />
        </b>
      ) : null}
    </span>
  );
}
