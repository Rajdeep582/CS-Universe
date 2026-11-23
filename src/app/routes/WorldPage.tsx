import { Link, useParams } from '@tanstack/react-router';
import { Castle, Gift, Lock, Map, Sparkles } from 'lucide-react';
import { worldById } from '@/engine/content';
import { useProgress } from '../useProgress';
import { stagesOf, stageStatus, worldStatus } from '../derive';
import { Breadcrumbs, GlassPanel, ProgressBar, Tag } from '@/ui/components';
import { NotFound } from './NotFound';

export function WorldPage() {
  const { worldId } = useParams({ from: '/_atlas/atlas/$worldId' });
  const w = worldById.get(worldId);
  const { cleared } = useProgress();
  if (!w) return <NotFound />;
  const ws = worldStatus(w, cleared);
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Atlas', to: '/atlas' }, { label: `World ${w.order} · ${w.biome}` }]} />
      <GlassPanel className="rise flex items-center gap-6 overflow-hidden rounded-[28px] p-0">
        <div className="relative h-[170px] w-[420px] flex-none overflow-hidden" aria-hidden>
          <img
            src={`/islands/${w.id}.webp`}
            alt=""
            width={720}
            height={259}
            className="size-full object-cover"
            style={ws.open ? undefined : { filter: 'grayscale(.8) brightness(1.06)' }}
          />
          <span className="absolute bottom-2 left-4 font-display text-[72px] font-extrabold leading-none text-white drop-shadow-[0_3px_6px_rgb(0_20_60/.5)]">
            {w.order}
          </span>
        </div>
        <div className="flex-1 py-5 pr-7">
          <p className="font-display text-xs font-extrabold tracking-[.16em] text-gold-4">
            WORLD {w.order} · {w.title.toUpperCase()}
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">{w.biome}</h1>
          <p className="mt-1 text-[15px] font-medium text-ink-2">
            {w.tagline}. {w.stageIds.length} stages, {w.levelCount} levels.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar
              className="max-w-[360px] flex-1"
              value={ws.cleared / ws.total}
              tone="mint"
              label={`${w.biome} levels cleared`}
            />
            <span className="text-sm font-bold text-ink-2">
              {ws.cleared} / {ws.total} levels cleared
            </span>
          </div>
        </div>
      </GlassPanel>

      <ol className="grid gap-4" aria-label={`Stages of ${w.biome}`}>
        {stagesOf(w).map((s, i) => {
          const st = stageStatus(s, cleared);
          return (
            <li key={s.id} className="rise" style={{ animationDelay: `${i * 40}ms` }}>
              <Link
                to="/atlas/$worldId/$stageId"
                params={{ worldId: w.id, stageId: s.id }}
                className="glass glass-interactive flex items-center gap-5 rounded-[24px] p-4 pr-6"
                aria-label={`Stage ${w.order}-${s.order}: ${s.title}${st.open ? '' : ', locked'}`}
              >
                <span
                  className={`tile ${st.open ? 'tile-sky' : 'tile-lock'} size-16 flex-none font-display text-xl font-extrabold`}
                >
                  {w.order}-{s.order}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl font-extrabold">{s.title}</span>
                  <span className="mt-1.5 flex flex-wrap gap-2">
                    <Tag>Tier {s.tier}</Tag>
                    <Tag>{s.units.length} units</Tag>
                    <Tag>
                      <Map />
                      {s.coreLevelCount} road levels
                    </Tag>
                    <Tag tone="gold">
                      <Gift />
                      {s.levelCount - s.coreLevelCount} bonus
                    </Tag>
                    <Tag tone="rose">
                      <Castle />
                      Boss: {s.boss.title}
                    </Tag>
                  </span>
                </span>
                <span className="w-[200px] flex-none text-right">
                  {st.open ? (
                    <Tag tone="mint">
                      <Sparkles />
                      {st.available} ready · {st.cleared} cleared
                    </Tag>
                  ) : (
                    <>
                      <Tag tone="lock">
                        <Lock />
                        Locked
                      </Tag>
                      {st.needs.length ? (
                        <span className="mt-1 block text-[12px] font-semibold text-muted">
                          Needs {st.needs.map((n) => n.biome).join(', ')}
                        </span>
                      ) : null}
                    </>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
