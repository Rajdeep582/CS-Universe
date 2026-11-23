import { CalendarClock, Crown, Repeat } from 'lucide-react';
import type { LevelInfo } from './useProgress';

/** One line about a cleared level's spaced review: due, next date, mastered or dimmed. */
export function ReviewNote({ info, className }: { info: LevelInfo; className?: string }) {
  if (info.medal !== 'cleared') return null;
  const date = info.nextReview?.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const [icon, text] = info.due
    ? [<Repeat key="i" size={16} />, 'Review due — a short recall test keeps it fresh.']
    : info.dim
      ? [
          <Repeat key="i" size={16} />,
          `Third star dimmed after a missed review — pass the next one (${date}) to restore it.`,
        ]
      : info.mastered
        ? [<Crown key="i" size={16} />, `Mastered ★★★ · next review ${date}`]
        : [<CalendarClock key="i" size={16} />, `Next review ${date} — pass one 3+ days after clearing to master it.`];
  return (
    <p className={`flex items-start gap-2 text-[12.5px] font-semibold text-sky-3 ${className ?? ''}`}>
      <span className="mt-0.5 flex-none" aria-hidden>
        {icon}
      </span>
      {text}
    </p>
  );
}
