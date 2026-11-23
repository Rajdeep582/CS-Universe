import { Play } from 'lucide-react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { stageById, stageCode, worldById } from '@/engine/content';
import { useProgress } from '@/app/useProgress';
import { GemButton, LevelMedallion } from '../components';

/** The single "what next" call to action: next Core Path level (3D stage view, or Atlas page when in the Atlas). */
export function ContinueBar() {
  const { next } = useProgress();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as { level?: string } });
  if (!next || path === '/gallery') return null;
  const st = stageById.get(next.stageId)!;
  const w = worldById.get(st.worldId)!;
  const inAtlas = path.startsWith('/atlas');
  if (!inAtlas && path === `/world/${w.id}/${st.id}` && search.level === next.id) return null;
  const go = () =>
    inAtlas
      ? navigate({
          to: '/atlas/$worldId/$stageId/$levelId',
          params: { worldId: w.id, stageId: st.id, levelId: next.id },
        })
      : navigate({
          to: '/world/$worldId/$stageId',
          params: { worldId: w.id, stageId: st.id },
          search: { level: next.id },
        });
  return (
    <div
      data-hud
      className="glass pointer-events-auto fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center rounded-[30px] p-2"
    >
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
        onClick={() => void go()}
      >
        {next.corePathPosition === 1 ? 'START' : 'CONTINUE'}
      </GemButton>
    </div>
  );
}
