import { Link } from '@tanstack/react-router';
import { Lock, PenLine, Play, Repeat } from 'lucide-react';
import { clsx } from 'clsx';
import type { Level } from '@/engine/content';
import { hasLesson } from '@/play/lessons';
import { useProgress } from './useProgress';

/** Entry to the lesson chamber. Honest states: locked, lesson not yet written, play / continue / replay, review due. */
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
  const { info } = useProgress();
  const li = info(level);
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
  if (li.due)
    return (
      <Link
        to="/play/$levelId"
        params={{ levelId: level.id }}
        search={{ review: true }}
        className={clsx(cls, 'gem-sky')}
      >
        <Repeat size={20} /> Review now
      </Link>
    );
  return (
    <Link to="/play/$levelId" params={{ levelId: level.id }} className={clsx(cls, 'gem-go')}>
      <Play size={20} fill="currentColor" strokeWidth={0} />{' '}
      {li.stars ? 'Replay level' : li.progress > 0 ? 'Continue lesson' : 'Play level'}
    </Link>
  );
}
