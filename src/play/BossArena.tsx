import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { BookOpen, Castle, Check, Lock, Map as MapIcon, Swords, Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import 'katex/dist/katex.min.css';
import './play.css';
import { levelById, levelsOfStage, stageById, stageCode, worldById } from '@/engine/content';
import { useLearner } from '@/engine/progress/learner';
import { XP } from '@/engine/progress/replay';
import { hashString } from '@/engine/world/noise';
import {
  BOSS_SIZE,
  drawBoss,
  gradeTest,
  isCorrect,
  PASS,
  type BossPresented,
  type TestResult,
} from '@/engine/lesson/testEngine';
import { Breadcrumbs, GemButton, GlassPanel, LevelMedallion } from '@/ui/components';
import { NotFound } from '@/app/routes/NotFound';
import { useProgress } from '@/app/useProgress';
import { lessons } from './lessons';
import { TestRunner } from './TestRunner';

type Mode =
  | { kind: 'intro' }
  | { kind: 'fight'; presented: BossPresented[]; startedAt: number }
  | { kind: 'result'; result: TestResult; missed: string[]; first: boolean };

const now = () => Date.now();
const freshSeed = (id: string) => hashString(`${id}#${Date.now()}#${Math.random()}`);

/** Stage boss: an exam across every level of the stage, framed as the boss scenario (03 §7). */
export function BossArena() {
  const { stageId } = useParams({ from: '/_play/boss/$stageId' });
  const s = stageById.get(stageId);
  const { cleared } = useProgress();
  const beaten = useLearner((st) => st.bosses.has(stageId));
  const record = useLearner((st) => st.record);
  const [mode, setMode] = useState<Mode>({ kind: 'intro' });
  if (!s) return <NotFound />;
  const w = worldById.get(s.worldId)!;
  const levels = levelsOfStage(s.id);
  const core = levels.filter((l) => l.core);
  const missing = core.filter((l) => !cleared.has(l.id));
  const open = missing.length === 0;

  const start = () => {
    const sources = levels
      .filter((l) => (l.core || cleared.has(l.id)) && lessons[l.id])
      .map((l) => ({ levelId: l.id, core: l.core, pool: lessons[l.id]!.test, steps: lessons[l.id]!.steps }));
    setMode({
      kind: 'fight',
      presented: drawBoss(sources, freshSeed(s.id)),
      startedAt: now(),
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const finish = (m: Extract<Mode, { kind: 'fight' }>, responses: Parameters<typeof gradeTest>[1]) => {
    const result = gradeTest(m.presented, responses);
    const first = !useLearner.getState().bosses.has(s.id);
    record({ t: 'boss', stage: s.id, correct: result.correct, total: result.total, ms: now() - m.startedAt });
    const missed = [
      ...new Set(
        m.presented
          .filter((p, i) => responses[i] === undefined || !isCorrect(p.item, responses[i]!))
          .map((p) => p.levelId),
      ),
    ];
    setMode({ kind: 'result', result, missed, first });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <>
      <div className="app-bg" aria-hidden />
      <main id="main" className="relative z-10 mx-auto max-w-[1000px] px-6 pb-24 pt-[150px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Breadcrumbs
            items={[
              { label: `World ${w.order} · ${w.biome}`, to: '/world/$worldId', params: { worldId: w.id } },
              {
                label: `${stageCode(s)} ${s.title}`,
                to: '/world/$worldId/$stageId',
                params: { worldId: w.id, stageId: s.id },
              },
              { label: `Boss · ${s.boss.title}` },
            ]}
          />
          <Link
            to="/world/$worldId/$stageId"
            params={{ worldId: w.id, stageId: s.id }}
            search={{ level: '__boss' }}
            className="gem gem-glass gem-sm"
          >
            <MapIcon size={16} /> Back to map
          </Link>
        </div>
        <GlassPanel as="section" aria-labelledby="boss-title" className="rounded-[28px] p-6 sm:p-9">
          {mode.kind === 'intro' ? (
            <div className="text-center">
              <span className={clsx('tile mx-auto size-20', open ? 'tile-rose' : 'tile-lock')}>
                {open ? <Castle size={40} /> : <Lock size={36} />}
              </span>
              <p className="mt-4 font-display text-[12px] font-extrabold tracking-[.2em] text-rose-2">
                STAGE BOSS · {stageCode(s)} {s.title.toUpperCase()}
              </p>
              <h1 id="boss-title" className="mt-1 font-display text-[38px] font-extrabold tracking-tight">
                {s.boss.title}
              </h1>
              <p className="mx-auto mt-3 max-w-[620px] text-[15.5px] font-medium leading-relaxed text-ink-2">
                {s.boss.description}
              </p>
              {beaten ? (
                <p className="mt-3 flex items-center justify-center gap-2 font-bold text-mint-3">
                  <Trophy size={18} aria-hidden /> Beaten — the castle flag flies. Fight again any time for practice.
                </p>
              ) : null}
              <ul className="mx-auto mt-6 grid max-w-[720px] gap-2 text-left sm:grid-cols-2" aria-label="Road levels">
                {core.map((l) => (
                  <li key={l.id}>
                    <Link
                      to="/world/$worldId/$stageId"
                      params={{ worldId: w.id, stageId: s.id }}
                      search={{ level: l.id }}
                      className="flex items-center gap-3 rounded-2xl bg-white/50 px-3 py-2 hover:bg-white/80"
                    >
                      <LevelMedallion state={cleared.has(l.id) ? 'cleared' : 'available'} number={l.number} size={30} />
                      <span className="flex-1 text-[14px] font-semibold">{l.title}</span>
                      {cleared.has(l.id) ? <Check size={16} className="text-mint-3" aria-label="cleared" /> : null}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[13.5px] font-semibold text-muted">
                {open
                  ? `Up to ${BOSS_SIZE} questions from every level of this stage · ${Math.round(PASS * 100)} % beats the boss · +${XP.boss + XP.stage} XP`
                  : `Clear all ${core.length} road levels to open the castle (${core.length - missing.length}/${core.length}).`}
              </p>
              <GemButton
                className="mt-5"
                size="lg"
                variant="rose"
                icon={<Swords size={22} />}
                onClick={start}
                disabled={!open}
              >
                {beaten ? 'FIGHT AGAIN' : 'FIGHT'}
              </GemButton>
            </div>
          ) : mode.kind === 'fight' ? (
            <>
              <p className="font-display text-[11.5px] font-extrabold tracking-[.16em] text-rose-2">
                STAGE BOSS · {s.boss.title.toUpperCase()}
              </p>
              <h1 id="boss-title" className="mb-5 font-display text-[26px] font-extrabold">
                {s.title}
              </h1>
              <TestRunner
                key={mode.startedAt}
                presented={mode.presented}
                steps={[]}
                sourceOf={(p) => {
                  const lv = (p as BossPresented).levelId;
                  return {
                    step: lessons[lv]!.steps.find((x) => x.id === p.item.teaches)!,
                    level: levelById.get(lv)!.title,
                  };
                }}
                onFinish={(r) => finish(mode, r)}
              />
            </>
          ) : (
            <div className="text-center">
              <span className={clsx('tile mx-auto size-20', mode.result.passed ? 'tile-gold' : 'tile-rose')}>
                {mode.result.passed ? <Trophy size={40} /> : <Castle size={40} />}
              </span>
              <p
                className={clsx(
                  'mt-4 font-display text-[12px] font-extrabold tracking-[.2em]',
                  mode.result.passed ? 'text-mint-3' : 'text-rose-3',
                )}
              >
                {mode.result.passed ? 'BOSS BEATEN' : 'THE CASTLE HOLDS — FOR NOW'}
              </p>
              <h1 id="boss-title" className="mt-1 font-display text-[34px] font-extrabold">
                {s.boss.title}
              </h1>
              <p className="mt-2 text-[15px] font-semibold text-ink-2">
                {mode.result.correct} of {mode.result.total} correct · {Math.round(mode.result.score * 100)} %
                {mode.result.passed && mode.first ? ` · +${XP.boss + XP.stage} XP` : ''}
              </p>
              {mode.missed.length ? (
                <section
                  aria-labelledby="missed"
                  className="glass mx-auto mt-5 max-w-[560px] rounded-[22px] p-4 text-left"
                >
                  <h2 id="missed" className="font-display text-[12.5px] font-extrabold tracking-[.14em] text-rose-3">
                    LEVELS TO REVISIT
                  </h2>
                  <ul className="mt-2 space-y-1">
                    {mode.missed.map((id) => (
                      <li key={id}>
                        <Link
                          to="/play/$levelId"
                          params={{ levelId: id }}
                          className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/60"
                        >
                          <BookOpen size={17} className="text-sky-3" aria-hidden />
                          <span className="font-semibold">{levelById.get(id)!.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <GemButton variant={mode.result.passed ? 'glass' : 'rose'} icon={<Swords size={18} />} onClick={start}>
                  {mode.result.passed ? 'Fight again' : 'Try again'}
                </GemButton>
                <Link
                  to="/world/$worldId/$stageId"
                  params={{ worldId: w.id, stageId: s.id }}
                  search={{ level: '__boss' }}
                  className="gem gem-go gem-md"
                >
                  <MapIcon size={18} /> Back to {w.biome}
                </Link>
              </div>
            </div>
          )}
        </GlassPanel>
      </main>
    </>
  );
}
