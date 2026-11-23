import { Play } from 'lucide-react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { stageById, stageCode, worldById } from '@/engine/content';
import { useProgress } from '@/app/useProgress';
import { GemButton, LevelMedallion } from '../components';

/** The single "what next" call to action: next Core Path level. */
export function ContinueBar() {
  const { next } = useProgress();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (!next || path === '/gallery') return null;
  const st = stageById.get(next.stageId)!;
  const w = worldById.get(st.worldId)!;
  return (
    <div className="glass pointer-events-auto fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center rounded-[30px] p-2">
      <div className="flex items-center gap-3 pl-2 pr-5">
        <LevelMedallion state="current" number={next.number} size={52} />
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
            Next on your path · World {w.order} · Stage {stageCode(st)}
          </p>
          <p className="font-display text-base font-bold">{next.title}</p>
        </div>
      </div>
      <GemButton
        size="lg"
        variant="go"
        icon={<Play fill="currentColor" strokeWidth={0} size={26} />}
        onClick={() =>
          navigate({
            to: '/atlas/$worldId/$stageId/$levelId',
            params: { worldId: w.id, stageId: st.id, levelId: next.id },
          })
        }
      >
        {next.corePathPosition === 1 ? 'START' : 'CONTINUE'}
      </GemButton>
    </div>
  );
}
