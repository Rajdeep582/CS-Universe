import { Link } from '@tanstack/react-router';
import { Lock, PenLine, Play } from 'lucide-react';
import { clsx } from 'clsx';
import type { Level } from '@/engine/content';
import { useLearner } from '@/engine/progress/learner';
import { hasLesson } from '@/play/lessons';

/** Entry to the lesson chamber. Honest states: locked, lesson not yet written, play / replay. */
export function PlayButton({
  level,
  locked,
  size = 'sm',
  className,
}: {
  level: Level;
  locked: boolean;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const stars = useLearner((s) => s.stars.get(level.id) ?? 0);
  const cls = clsx('gem', `gem-${size === 'lg' ? 'lg' : 'md'}`, className);
  if (locked)
    return (
      <span className={clsx(cls, 'gem-glass pointer-events-none opacity-60')} aria-disabled="true">
        <Lock size={18} /> Locked
      </span>
    );
  if (!hasLesson(level.id))
    return (
      <span
        className={clsx(cls, 'gem-glass pointer-events-none opacity-70')}
        aria-disabled="true"
        title="Lessons are added world by world"
      >
        <PenLine size={18} /> Lesson in production
      </span>
    );
  return (
    <Link to="/play/$levelId" params={{ levelId: level.id }} className={clsx(cls, 'gem-go')}>
      <Play size={20} fill="currentColor" strokeWidth={0} /> {stars ? 'Replay level' : 'Play level'}
    </Link>
  );
}
