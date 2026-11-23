import { Link, useParams } from '@tanstack/react-router';
import { BookOpen, Castle, Gift, Lock } from 'lucide-react';
import { levelById, levelsOfStage, stageById, stageCode, worldById, type Level } from '@/engine/content';
import { useProgress } from '../useProgress';
import { stageStatus } from '../derive';
import { Breadcrumbs, GlassPanel, LevelMedallion, ProgressBar, StarRating, Tag } from '@/ui/components';
import { NotFound } from './NotFound';

function LevelRow({ l, here }: { l: Level; here: string }) {
  const { medal, starsOf } = useProgress();
  const m = medal(l);
  return (
    <li>
      <Link
        to="/atlas/$worldId/$stageId/$levelId"
        params={{ worldId: l.worldId, stageId: l.stageId, levelId: l.id }}
        className="flex items-center gap-4 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-white/60"
      >
        <LevelMedallion state={m} number={l.number} size={46} />
        <span className="min-w-0 flex-1">
          <span className={`block font-display text-[17px] font-bold ${m === 'locked' ? 'text-[#51627e]' : ''}`}>
            {l.title}
          </span>
          {l.requires.length ? (
            <span className="mt-0.5 block truncate text-[12px] font-semibold text-muted">
              Needs:{' '}
              {l.requires
                .map((r) => {
                  const t = levelById.get(r)!;
                  return t.stageId === here ? t.title : `${t.title} (${stageById.get(t.stageId)!.title})`;
                })
                .join(' · ')}
            </span>
          ) : (
            <span className="mt-0.5 block text-[12px] font-semibold text-muted">No prerequisites — start here</span>
          )}
        </span>
        {l.number === null ? (
          <Tag tone="gold">
            <Gift />
            Bonus
          </Tag>
        ) : null}
        {m === 'current' ? <Tag tone="rose">Up next</Tag> : null}
        {m === 'cleared' ? <StarRating stars={starsOf(l.id) as 1 | 2 | 3} size={16} /> : null}
      </Link>
    </li>
  );
}

export function StagePage() {
  const { worldId, stageId } = useParams({ from: '/_atlas/atlas/$worldId/$stageId' });
  const s = stageById.get(stageId);
  const { cleared } = useProgress();
  if (!s || s.worldId !== worldId) return <NotFound />;
  const w = worldById.get(s.worldId)!;
  const st = stageStatus(s, cleared);
  const core = levelsOfStage(s.id).filter((l) => l.core);
  const coreCleared = core.filter((l) => cleared.has(l.id)).length;
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Atlas', to: '/atlas' },
          { label: `World ${w.order} · ${w.biome}`, to: '/atlas/$worldId', params: { worldId: w.id } },
          { label: s.title },
        ]}
      />
      <GlassPanel className="rise rounded-[28px] p-7">
        <p className="font-display text-xs font-extrabold tracking-[.16em] text-gold-4">
          WORLD {w.order} · {w.biome.toUpperCase()} · STAGE {s.order} OF {w.stageIds.length} · TIER {s.tier}
        </p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">{s.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ProgressBar
            className="w-[320px]"
            value={st.cleared / st.total}
            tone="mint"
            label={`${s.title} levels cleared`}
          />
          <span className="text-sm font-bold text-ink-2">
            {st.cleared} / {st.total} levels cleared · {s.coreLevelCount} on the road ·{' '}
            {s.levelCount - s.coreLevelCount} bonus
          </span>
        </div>
      </GlassPanel>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {s.units.map((u, i) => (
            <GlassPanel
              as="section"
              key={u.id}
              aria-labelledby={`unit-${u.id}`}
              className="rise rounded-[24px] p-4"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <h2
                id={`unit-${u.id}`}
                className="px-3 pb-1 pt-1 font-display text-[13px] font-extrabold tracking-[.14em] text-muted"
              >
                UNIT {i + 1} · {u.title.toUpperCase()}
              </h2>
              <ol>
                {u.levelIds.map((id) => (
                  <LevelRow key={id} l={levelById.get(id)!} here={s.id} />
                ))}
              </ol>
            </GlassPanel>
          ))}
        </div>
        <aside className="space-y-5">
          <GlassPanel className="rise rounded-[24px] p-5">
            <div className="flex items-center gap-3">
              <span className="tile tile-rose size-12">
                <Castle size={24} />
              </span>
              <div>
                <p className="font-display text-[11px] font-extrabold tracking-[.16em] text-rose-2">STAGE BOSS</p>
                <h2 className="font-display text-xl font-extrabold">{s.boss.title}</h2>
              </div>
            </div>
            <p className="mt-3 text-[13.5px] font-medium leading-relaxed text-ink-2">{s.boss.description}</p>
            <p className="mt-3 flex items-center gap-2 text-[12.5px] font-bold text-rose-3">
              <Lock size={15} aria-hidden />
              {coreCleared === core.length
                ? 'Unlocked'
                : `Clear all ${core.length} road levels to unlock (${coreCleared}/${core.length})`}
            </p>
          </GlassPanel>
          <GlassPanel className="rise rounded-[24px] p-5">
            <h2 className="flex items-center gap-2 font-display text-[13px] font-extrabold tracking-[.14em] text-muted">
              <BookOpen size={16} aria-hidden /> SOURCES
            </h2>
            <ul className="mt-2 space-y-1.5 text-[13px] font-medium text-ink-2">
              {s.refs.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </GlassPanel>
          <p className="px-2 text-[12px] font-semibold text-white/90">
            Stage code {stageCode(s)} · Core Path step {s.corePathIndex + 1}
          </p>
        </aside>
      </div>
    </div>
  );
}
