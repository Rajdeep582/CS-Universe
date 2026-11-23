import { Lock, Gift } from 'lucide-react';
import { clsx } from 'clsx';

export type MedalState = 'locked' | 'available' | 'current' | 'cleared';

interface Props {
  state: MedalState;
  /** Road number, or null for a bonus level. */
  number: number | null;
  size?: number;
}

const LABEL: Record<MedalState, string> = {
  locked: 'locked',
  available: 'available',
  current: 'up next',
  cleared: 'cleared',
};

export function LevelMedallion({ state, number, size = 48 }: Props) {
  const bonus = number === null;
  return (
    <span
      role="img"
      aria-label={`${bonus ? 'Bonus level' : `Level ${number}`}, ${LABEL[state]}`}
      className={clsx('medal', `medal-${state}`, bonus && 'medal-bonus')}
      style={{ width: size, height: size, fontSize: size * 0.44 }}
    >
      {state === 'locked' ? (
        <Lock size={size * 0.4} strokeWidth={2.6} />
      ) : bonus ? (
        <Gift size={size * 0.44} strokeWidth={2.4} />
      ) : (
        number
      )}
    </span>
  );
}
