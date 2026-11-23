import { Link } from '@tanstack/react-router';
import { BookOpen, Map as MapIcon, Play, RotateCcw, Sparkles, Unlock } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { clsx } from 'clsx';
import type { Level } from '@/engine/content';
import { stageById, worldById } from '@/engine/content';
import type { StepMeta } from '@/engine/lesson/schema';
import { PASS, type TestResult } from '@/engine/lesson/testEngine';
import { GemButton, LevelMedallion, StarRating } from '@/ui/components';
import { hasLesson } from './lessons';

interface Props {
  level: Level;
  result: TestResult;
  xp: number;
  bestStars: number;
  opened: Level[];
  next: Level | null;
  steps: StepMeta[];
  onRetry: () => void;
  onReview: (stepId: string) => void;
}

function LevelGo({ l, children, className }: { l: Level; children: React.ReactNode; className?: string }) {
  return hasLesson(l.id) ? (
    <Link to="/play/$levelId" params={{ levelId: l.id }} className={className}>
      {children}
    </Link>
  ) : (
    <Link
      to="/world/$worldId/$stageId"
      params={{ worldId: l.worldId, stageId: l.stageId }}
      search={{ level: l.id }}
      className={className}
    >
      {children}
    </Link>
  );
}

/** Result of a level test: score, stars, XP, what it unlocked, and what to review. */
export function LevelClear({ level, result, xp, bestStars, opened, next, steps, onRetry, onReview }: Props) {
  const reduce = useReducedMotion();
  const pct = Math.round(result.score * 100);
  const st = stageById.get(level.stageId)!;
  return (
    <div className="space-y-6 text-center">
      <motion.div
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="mx-auto w-fit"
      >
        <LevelMedallion state={result.passed ? 'cleared' : 'available'} number={level.number} size={112} />
      </motion.div>
      <div>
        <p
          className={clsx(
            'font-display text-[12px] font-extrabold tracking-[.2em]',
            result.passed ? 'text-mint-3' : 'text-rose-3',
          )}
        >
          {result.passed ? 'LEVEL CLEARED' : 'NOT CLEARED YET'}
        </p>
        <h2 className="mt-1 font-display text-[34px] font-extrabold tracking-tight">{level.title}</h2>
        <p className="mt-2 text-[15px] font-semibold text-ink-2">
          {result.correct} of {result.total} correct · {pct} %{' '}
          {result.passed ? '' : `— ${Math.round(PASS * 100)} % clears the level`}
        </p>
      </div>
      <div className="mx-auto flex w-fit flex-wrap items-center justify-center gap-3">
        <span className="glass flex items-center gap-2 rounded-full px-4 py-2">
          <StarRating stars={result.stars as 0 | 1 | 2} size={22} />
          <span className="text-[13px] font-bold text-muted">
            this attempt{bestStars > result.stars ? ` · best ${bestStars}★` : ''}
          </span>
        </span>
        <span className="glass flex items-center gap-2 rounded-full px-4 py-2 font-display text-[15px] font-bold text-gold-4">
          <Sparkles size={17} aria-hidden /> +{xp} XP
        </span>
      </div>
      {result.passed && result.stars < 2 ? (
        <p className="text-[13.5px] font-medium text-ink-2">
          Score 90 % or more on a retake for ★★. The third star comes from a review test after 3+ days.
        </p>
      ) : null}

      {opened.length ? (
        <section aria-labelledby="opened" className="glass mx-auto max-w-[560px] rounded-[24px] p-5 text-left">
          <h3
            id="opened"
            className="flex items-center gap-2 font-display text-[12.5px] font-extrabold tracking-[.14em] text-mint-3"
          >
            <Unlock size={16} aria-hidden /> NEW LEVELS OPEN ({opened.length})
          </h3>
          <ul className="mt-2 space-y-1">
            {opened.map((l) => (
              <li key={l.id}>
                <LevelGo l={l} className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-white/60">
                  <LevelMedallion state="available" number={l.number} size={34} />
                  <span className="font-semibold">{l.title}</span>
                  <span className="ml-auto text-[12px] font-semibold text-muted">
                    {stageById.get(l.stageId)!.title}
                  </span>
                </LevelGo>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result.review.length ? (
        <section aria-labelledby="review" className="glass mx-auto max-w-[560px] rounded-[24px] p-5 text-left">
          <h3 id="review" className="font-display text-[12.5px] font-extrabold tracking-[.14em] text-rose-3">
            REVISIT THESE STEPS
          </h3>
          <ul className="mt-2 space-y-1">
            {result.review.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onReview(id)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left hover:bg-white/60"
                >
                  <BookOpen size={17} className="text-sky-3" aria-hidden />
                  <span className="font-semibold">{steps.find((s) => s.id === id)!.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap justify-center gap-3">
        <GemButton variant={result.passed ? 'glass' : 'go'} icon={<RotateCcw size={18} />} onClick={onRetry}>
          {result.passed ? 'Retake test' : 'Try again'}
        </GemButton>
        <Link
          to="/world/$worldId/$stageId"
          params={{ worldId: level.worldId, stageId: st.id }}
          search={{ level: level.id }}
          className="gem gem-glass gem-md"
        >
          <MapIcon size={18} /> Back to {worldById.get(st.worldId)!.biome}
        </Link>
        {result.passed && next ? (
          <LevelGo l={next} className="gem gem-go gem-md">
            <Play size={18} fill="currentColor" strokeWidth={0} /> Next: {next.title}
          </LevelGo>
        ) : null}
      </div>
    </div>
  );
}
