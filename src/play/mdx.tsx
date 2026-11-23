import { createContext, Suspense, useCallback, useContext, type ReactNode } from 'react';
import { AlertTriangle, Info, Lightbulb, Target, Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import { useLearner } from '@/engine/progress/learner';
import type { SimulationId } from '@/engine/sim/registry';
import { SIM_TITLES, SIM_VIEWS } from './sims/registry';

export const LessonCtx = createContext<{ levelId: string; active: string }>({ levelId: '', active: '' });

/** Only the active step renders; the player moves between steps. */
function Step({ id, children }: { id: string; section: string; title: string; children?: ReactNode }) {
  const { active } = useContext(LessonCtx);
  return id === active ? <>{children}</> : null;
}

const CALLOUT = {
  note: { icon: Info, cls: 'callout-note', label: 'Note' },
  tip: { icon: Lightbulb, cls: 'callout-tip', label: 'Tip' },
  warning: { icon: AlertTriangle, cls: 'callout-warning', label: 'Watch out' },
} as const;

function Callout({ kind = 'note', children }: { kind?: keyof typeof CALLOUT; children?: ReactNode }) {
  const c = CALLOUT[kind];
  return (
    <aside className={clsx('callout', c.cls)} aria-label={c.label}>
      <c.icon size={18} className="mt-0.5 flex-none" aria-hidden />
      <div>{children}</div>
    </aside>
  );
}

export function SimulationFrame({ id, goal, onGoal }: { id: SimulationId; goal?: string; onGoal?: () => void }) {
  const View = SIM_VIEWS[id];
  const reached = useLearner((s) => s.simGoals);
  const { levelId } = useContext(LessonCtx);
  const done = reached.has(`${levelId}:${id}`);
  return (
    <figure className="sim not-prose" aria-label={SIM_TITLES[id]}>
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-[15px] font-bold text-white">{SIM_TITLES[id]}</span>
        {goal ? (
          <span
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold',
              done ? 'bg-emerald-300 text-[#032016]' : 'bg-white/10 text-white/85',
            )}
          >
            {done ? <Trophy size={14} aria-hidden /> : <Target size={14} aria-hidden />}
            {done ? 'Goal reached · +20 XP' : `Goal: ${goal}`}
          </span>
        ) : null}
      </figcaption>
      <Suspense fallback={<p className="text-[13px] text-white/70">Loading simulation…</p>}>
        <View {...(onGoal ? { onGoal } : {})} />
      </Suspense>
    </figure>
  );
}

function Simulation({ id, goal }: { id: SimulationId; goal?: string }) {
  const { levelId } = useContext(LessonCtx);
  const reach = useLearner((s) => s.reachSimGoal);
  const onGoal = useCallback(() => reach(levelId, id), [reach, levelId, id]);
  return <SimulationFrame id={id} {...(goal ? { goal, onGoal } : {})} />;
}

export const mdxComponents = { Step, Callout, Simulation };
