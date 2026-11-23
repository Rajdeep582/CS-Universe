import { useReducedMotion } from 'motion/react';
import { usePrefs } from '@/engine/progress/settings';

/** True when celebrations should be static: the learner chose "calm" or the OS asks for reduced motion. */
export function useCalm(): boolean {
  const reduce = useReducedMotion();
  const calm = usePrefs((s) => s.celebrations === 'calm');
  return calm || !!reduce;
}
