import { Link } from '@tanstack/react-router';
import { BookOpen, CalendarClock, Map as MapIcon, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import type { Level } from '@/engine/content';
import type { StepMeta } from '@/engine/lesson/schema';
import type { TestResult } from '@/engine/lesson/testEngine';
import { LevelMedallion } from '@/ui/components';
import { Confetti } from '@/ui/celebrate/Confetti';
import { StarStamp } from '@/ui/celebrate/StarStamp';

interface Props {
  level: Level;
  result: TestResult;
  xp: number;
  mastered: boolean;
  nextDue: Date | null;
  steps: StepMeta[];
  onStep: (id: string) => void;
}

const fmt = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/** Result of a spaced review. Mastery gets the level-tier celebration with the third star. */
export function ReviewClear({ level, result, xp, mastered, nextDue, steps, onStep }: Props) {
  return (
    <div className="relative space-y-5 text-center">
      {mastered ? <Confetti count={110} duration={2.6} origin={[0.5, 0.2]} /> : null}
      <div className="mx-auto w-fit">
        <LevelMedallion state="cleared" number={level.number} size={104} mastered={mastered} />
      </div>
      <div>
        <p
          className={clsx(
            'font-display text-[12px] font-extrabold tracking-[.2em]',
            result.passed ? 'text-mint-3' : 'text-sky-3',
          )}
        >
          {mastered ? 'LEVEL MASTERED' : result.passed ? 'REVIEW PASSED' : 'REVIEW AGAIN SOON'}
        </p>
        <h2 className="mt-1 font-display text-[32px] font-extrabold tracking-tight">{level.title}</h2>
        <p className="mt-2 text-[15px] font-semibold text-ink-2">
          {result.correct} of {result.total} correct · {Math.round(result.score * 100)} %
        </p>
      </div>
      {mastered ? <StarStamp stars={3} size={40} /> : null}
      <div className="mx-auto flex w-fit flex-wrap justify-center gap-3">
        {xp ? (
          <span className="glass flex items-center gap-2 rounded-full px-4 py-2 font-display text-[15px] font-bold text-gold-4">
            <Sparkles size={17} aria-hidden /> +{xp} XP
          </span>
        ) : null}
        {nextDue ? (
          <span className="glass flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-bold text-ink-2">
            <CalendarClock size={17} aria-hidden /> Next review: {fmt(nextDue)}
          </span>
        ) : null}
      </div>
      {!result.passed ? (
        <p className="mx-auto max-w-[520px] text-[14px] font-medium text-ink-2">
          Nothing is lost — your stars stay. A quick look at these steps helps the next review:
        </p>
      ) : null}
      {result.review.length ? (
        <ul className="glass mx-auto max-w-[520px] rounded-[22px] p-3 text-left">
          {result.review.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onStep(id)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/60"
              >
                <BookOpen size={17} className="text-sky-3" aria-hidden />
                <span className="font-semibold">{steps.find((s) => s.id === id)!.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/journey" className="gem gem-glass gem-md">
          <CalendarClock size={18} /> Reviews & journey
        </Link>
        <Link
          to="/world/$worldId/$stageId"
          params={{ worldId: level.worldId, stageId: level.stageId }}
          search={{ level: level.id }}
          className="gem gem-go gem-md"
        >
          <MapIcon size={18} /> Back to map
        </Link>
      </div>
    </div>
  );
}
