import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Lock, Map as MapIcon } from 'lucide-react';
import { clsx } from 'clsx';
import 'katex/dist/katex.min.css';
import './play.css';
import { curriculum, levelById, stageById, worldById, stageCode, type Level } from '@/engine/content';
import { missingPrerequisites, newlyAvailable, nextCoreLevel } from '@/engine/progress/availability';
import { clearedSet, useLearner } from '@/engine/progress/learner';
import { SECTION_LABEL, type LessonMeta } from '@/engine/lesson/schema';
import {
  drawTest,
  gradeTest,
  seedFor,
  type Presented,
  type Response,
  type TestResult,
} from '@/engine/lesson/testEngine';
import { Breadcrumbs, GemButton, GlassPanel, Kbd, LevelMedallion, ProgressBar } from '@/ui/components';
import { NotFound } from '@/app/routes/NotFound';
import { useProgress } from '@/app/useProgress';
import { lessonComponent, lessons } from './lessons';
import { LessonCtx, mdxComponents } from './mdx';
import { TestRunner } from './TestRunner';
import { LevelClear } from './LevelClear';

type Mode =
  | { kind: 'lesson' }
  | { kind: 'test'; presented: Presented[]; attempt: number }
  | { kind: 'result'; result: TestResult; xp: number; opened: Level[]; next: Level | null };

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

function Shell({ level, children }: { level: Level; children: React.ReactNode }) {
  const s = stageById.get(level.stageId)!;
  const w = worldById.get(level.worldId)!;
  return (
    <>
      <div className="app-bg" aria-hidden />
      <main id="main" className="relative z-10 mx-auto max-w-[1240px] px-6 pb-24 pt-[150px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Breadcrumbs
            items={[
              { label: `World ${w.order} · ${w.biome}`, to: '/world/$worldId', params: { worldId: w.id } },
              {
                label: `${stageCode(s)} ${s.title}`,
                to: '/world/$worldId/$stageId',
                params: { worldId: w.id, stageId: s.id },
              },
              { label: level.title },
            ]}
          />
          <Link
            to="/world/$worldId/$stageId"
            params={{ worldId: w.id, stageId: s.id }}
            search={{ level: level.id }}
            className="gem gem-glass gem-sm"
          >
            <MapIcon size={16} /> Back to map
          </Link>
        </div>
        {children}
      </main>
    </>
  );
}

function Locked({ level }: { level: Level }) {
  const { cleared } = useProgress();
  const missing = missingPrerequisites(level, cleared);
  return (
    <GlassPanel className="mx-auto max-w-[620px] rounded-[28px] p-8 text-center">
      <span className="tile tile-lock mx-auto size-16">
        <Lock size={30} />
      </span>
      <h1 className="mt-4 font-display text-3xl font-extrabold">{level.title} is locked</h1>
      <p className="mt-2 font-medium text-ink-2">
        Clear {missing.length === 1 ? 'this level' : `these ${missing.length} levels`} first:
      </p>
      <ul className="mt-3 space-y-1 text-left">
        {missing.map((id) => {
          const r = levelById.get(id)!;
          return (
            <li key={id}>
              <Link
                to="/world/$worldId/$stageId"
                params={{ worldId: r.worldId, stageId: r.stageId }}
                search={{ level: r.id }}
                className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-white/60"
              >
                <LevelMedallion state="available" number={r.number} size={34} />
                <span className="font-semibold">{r.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}

function NoLesson({ level }: { level: Level }) {
  return (
    <GlassPanel className="mx-auto max-w-[620px] rounded-[28px] p-8 text-center">
      <h1 className="font-display text-3xl font-extrabold">{level.title}</h1>
      <p className="mt-3 font-medium text-ink-2">
        This level&apos;s lesson and test have not been written yet. Lessons are added world by world; the level stays
        on the map and opens for play as soon as its lesson ships.
      </p>
    </GlassPanel>
  );
}

export function LessonChamber() {
  const { levelId } = useParams({ from: '/_play/play/$levelId' });
  const level = levelById.get(levelId);
  const { cleared } = useProgress();
  if (!level) return <NotFound />;
  const meta = lessons[level.id];
  const locked = !cleared.has(level.id) && missingPrerequisites(level, cleared).length > 0;
  return (
    <Shell level={level}>
      {locked ? (
        <Locked level={level} />
      ) : !meta ? (
        <NoLesson level={level} />
      ) : (
        <Chamber key={level.id} level={level} meta={meta} />
      )}
    </Shell>
  );
}

function LessonBody({ meta }: { meta: LessonMeta }) {
  const Content = lessonComponent(meta);
  // lessonComponent caches one lazy component per lesson, so its identity is stable across renders.
  // eslint-disable-next-line react-hooks/static-components
  return <Content components={mdxComponents} />;
}

function Chamber({ level, meta }: { level: Level; meta: LessonMeta }) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>({ kind: 'lesson' });
  const seen = useLearner((s) => s.seen.get(level.id));
  const viewStep = useLearner((s) => s.viewStep);
  const bestStars = useLearner((s) => s.stars.get(level.id) ?? 0);
  const top = useRef<HTMLDivElement>(null);
  const ids = useMemo(() => meta.steps.map((s) => s.id), [meta]);
  const cur = meta.steps[step]!;
  const studied = ids.every((id) => seen?.has(id));

  useEffect(() => {
    if (mode.kind === 'lesson') viewStep(level.id, cur.id, ids);
  }, [mode.kind, cur.id, ids, level.id, viewStep]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    top.current?.focus({ preventScroll: true });
  }, [step, mode.kind]);

  useEffect(() => {
    if (mode.kind !== 'lesson') return;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') setStep((s) => Math.min(meta.steps.length - 1, s + 1));
      else if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode.kind, meta.steps.length]);

  const startTest = () => {
    const attempt = useLearner.getState().startAttempt(level.id);
    setMode({ kind: 'test', presented: drawTest(meta.test, meta.steps, seedFor(level.id, attempt)), attempt });
  };
  const finish = (presented: Presented[], responses: Response[]) => {
    const before = clearedSet(useLearner.getState().stars);
    const result = gradeTest(presented, responses);
    const xp = useLearner.getState().recordTest(level.id, result);
    const after = clearedSet(useLearner.getState().stars);
    setMode({
      kind: 'result',
      result,
      xp,
      opened: newlyAvailable(curriculum.levels, before, after),
      next: nextCoreLevel(curriculum, after),
    });
  };
  const review = (id: string) => {
    setStep(Math.max(0, ids.indexOf(id)));
    setMode({ kind: 'lesson' });
  };

  const rail = (
    <nav
      aria-label="Lesson steps"
      className="glass sticky top-[150px] hidden max-h-[calc(100vh-170px)] overflow-y-auto rounded-[24px] p-3 lg:block"
    >
      <p className="px-2 pb-2 pt-1 font-display text-[11px] font-extrabold tracking-[.16em] text-muted">
        LESSON · {meta.steps.length} STEPS
      </p>
      <ol className="space-y-0.5">
        {meta.steps.map((s, i) => {
          const done = seen?.has(s.id);
          const on = mode.kind === 'lesson' && i === step;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setStep(i);
                  setMode({ kind: 'lesson' });
                }}
                aria-current={on ? 'step' : undefined}
                className={clsx(
                  'flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left',
                  on ? 'bg-sky-2/15' : 'hover:bg-white/60',
                )}
              >
                <span
                  className={clsx(
                    'mt-0.5 grid size-5 flex-none place-items-center rounded-full text-[10px] font-bold',
                    done ? 'bg-mint-2 text-white' : on ? 'bg-sky-2 text-white' : 'bg-[rgb(11_36_71/.08)] text-muted',
                  )}
                >
                  {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[10.5px] font-bold uppercase tracking-wider text-muted">
                    {SECTION_LABEL[s.section]}
                  </span>
                  <span
                    className={clsx('block text-[13.5px] leading-snug', on ? 'font-bold' : 'font-semibold text-ink-2')}
                  >
                    {s.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 border-t border-line px-1 pt-3">
        <button
          type="button"
          onClick={startTest}
          disabled={!studied || mode.kind === 'test'}
          className={clsx(
            'flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-[13.5px] font-bold',
            studied ? 'text-[#6d28d9] hover:bg-white/60' : 'cursor-not-allowed text-muted',
          )}
        >
          <ClipboardCheck size={18} aria-hidden /> Level test {studied ? '' : '· finish all steps'}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
      {rail}
      <GlassPanel as="section" aria-labelledby="chamber-title" className="rounded-[28px] p-6 sm:p-9">
        <div ref={top} tabIndex={-1} className="scroll-mt-[160px] outline-none">
          {mode.kind === 'lesson' ? (
            <>
              <div className="flex items-center gap-4">
                <LevelMedallion state={bestStars ? 'cleared' : 'current'} number={level.number} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[11.5px] font-extrabold tracking-[.16em] text-gold-4">
                    {level.title.toUpperCase()} · STEP {step + 1} OF {meta.steps.length} ·{' '}
                    {SECTION_LABEL[cur.section].toUpperCase()}
                  </p>
                  <h1
                    id="chamber-title"
                    className="mt-0.5 font-display text-[30px] font-extrabold leading-tight tracking-tight"
                  >
                    {cur.title}
                  </h1>
                </div>
              </div>
              <ProgressBar value={(step + 1) / meta.steps.length} tone="xp" label="Lesson progress" className="mt-4" />
              <article className="lesson mt-6">
                <LessonCtx.Provider value={{ levelId: level.id, active: cur.id }}>
                  <Suspense fallback={<p className="text-muted">Loading lesson…</p>}>
                    <LessonBody meta={meta} />
                  </Suspense>
                </LessonCtx.Provider>
              </article>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                <GemButton
                  variant="glass"
                  icon={<ArrowLeft size={18} />}
                  onClick={() => setStep(step - 1)}
                  disabled={step === 0}
                >
                  Back
                </GemButton>
                <span className="hidden items-center gap-1.5 text-[12px] font-semibold text-muted sm:flex">
                  <Kbd>←</Kbd> <Kbd>→</Kbd> to move between steps
                </span>
                {step < meta.steps.length - 1 ? (
                  <GemButton variant="sky" iconAfter={<ArrowRight size={18} />} onClick={() => setStep(step + 1)}>
                    Next step
                  </GemButton>
                ) : (
                  <GemButton variant="go" icon={<ClipboardCheck size={18} />} onClick={startTest} disabled={!studied}>
                    {studied ? 'Take the level test' : 'Visit every step to unlock the test'}
                  </GemButton>
                )}
              </div>
            </>
          ) : mode.kind === 'test' ? (
            <>
              <p className="font-display text-[11.5px] font-extrabold tracking-[.16em] text-[#6d28d9]">
                LEVEL TEST · ATTEMPT {mode.attempt}
              </p>
              <h1 id="chamber-title" className="mb-5 font-display text-[26px] font-extrabold">
                {level.title}
              </h1>
              <TestRunner
                key={mode.attempt}
                presented={mode.presented}
                steps={meta.steps}
                onFinish={(r) => finish(mode.presented, r)}
              />
            </>
          ) : (
            <>
              <h1 id="chamber-title" className="sr-only">
                Level test result
              </h1>
              <LevelClear
                level={level}
                result={mode.result}
                xp={mode.xp}
                bestStars={bestStars}
                opened={mode.opened}
                next={mode.next}
                steps={meta.steps}
                onRetry={startTest}
                onReview={review}
              />
            </>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
