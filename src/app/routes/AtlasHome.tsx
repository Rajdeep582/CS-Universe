import { Link, useSearch } from '@tanstack/react-router';
import { Layers, Lock, Map, MonitorX, Sparkles, Star } from 'lucide-react';
import { curriculum, levelsOfWorld } from '@/engine/content';
import { useProgress } from '../useProgress';
import { worldStatus } from '../derive';
import { GlassPanel, ProgressBar, StarRating, Tag } from '@/ui/components';

export function AtlasHome() {
  const { cleared, stars } = useProgress();
  const s = curriculum.stats;
  const { notice } = useSearch({ from: '/_atlas/atlas' });
  return (
    <div className="space-y-6">
      {notice === 'webgl' ? (
        <GlassPanel role="status" className="flex items-center gap-4 rounded-[22px] p-4">
          <span className="tile tile-sky size-11 flex-none">
            <MonitorX size={22} />
          </span>
          <p className="text-[14px] font-semibold text-ink-2">
            This browser cannot show the 3D world (WebGL 2 is unavailable), so you are in the 2D Atlas. Everything —
            worlds, stages, levels and progress — works the same here.
          </p>
        </GlassPanel>
      ) : null}
      <GlassPanel className="rise flex flex-wrap items-end justify-between gap-6 rounded-[28px] p-7">
        <div>
          <p className="font-display text-xs font-extrabold tracking-[.16em] text-gold-4">ATLAS · ALL WORLDS</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">Isles of Computing</h1>
          <p className="mt-2 max-w-[620px] text-[15px] font-medium text-ink-2">
            Each world is one area of computer science, each stage one subject, each level one topic. A level is cleared
            only by passing a test on what it taught.
          </p>
        </div>
        <dl className="grid grid-cols-4 gap-3">
          {[
            ['Worlds', s.worlds, 'tile-sky'],
            ['Stages', s.stages, 'tile-violet'],
            ['Levels', s.levels, 'tile-mint'],
            ['Stars', s.maxStars.toLocaleString('en-US'), 'tile-gold'],
          ].map(([k, v, t]) => (
            <div
              key={k}
              className="flex min-w-[118px] flex-col items-center rounded-[20px] bg-white/55 px-4 py-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/.9)]"
            >
              <dd className="font-display text-[30px] font-extrabold leading-none tabular-nums">{v}</dd>
              <dt
                className={`mt-2 rounded-lg px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[.12em] text-white tile ${t}`}
              >
                {k}
              </dt>
            </div>
          ))}
        </dl>
        <ul className="flex w-full flex-wrap gap-2" aria-label="How stars are earned">
          <li>
            <Tag tone="gold">
              <StarRating stars={1} size={12} /> Cleared · test ≥ 70%
            </Tag>
          </li>
          <li>
            <Tag tone="gold">
              <StarRating stars={2} size={12} /> Excellent · ≥ 90%
            </Tag>
          </li>
          <li>
            <Tag tone="gold">
              <StarRating stars={3} size={12} /> Mastered · review test
            </Tag>
          </li>
        </ul>
      </GlassPanel>

      <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Worlds">
        {curriculum.worlds.map((w, i) => {
          const st = worldStatus(w, cleared);
          const got = levelsOfWorld(w.id).reduce((n, l) => n + (stars.get(l.id) ?? 0), 0);
          const max = w.levelCount * 3;
          return (
            <li key={w.id} className="rise" style={{ animationDelay: `${i * 35}ms` }}>
              <Link
                to="/atlas/$worldId"
                params={{ worldId: w.id }}
                className="glass glass-interactive group block overflow-hidden rounded-[26px]"
                aria-label={`World ${w.order}: ${w.biome}, ${w.title}${st.open ? '' : ', locked'}`}
              >
                <div className="relative h-[150px] overflow-hidden">
                  <img
                    src={`/islands/${w.id}.webp`}
                    alt=""
                    width={720}
                    height={259}
                    loading={i < 6 ? 'eager' : 'lazy'}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    style={st.open ? undefined : { filter: 'grayscale(.6) brightness(1.02) saturate(.8)' }}
                  />
                  <span
                    className="absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255/0)_45%,rgb(11_36_71/.35))]"
                    aria-hidden
                  />
                  {!st.open ? (
                    <span
                      className="absolute inset-0 bg-[radial-gradient(80%_90%_at_50%_60%,rgb(240_246_255/.28),rgb(240_246_255/.06))]"
                      aria-hidden
                    />
                  ) : null}
                  <span className="absolute bottom-2 left-4 font-display text-[56px] font-extrabold leading-none text-white drop-shadow-[0_3px_6px_rgb(0_20_60/.5)]">
                    {w.order}
                  </span>
                  <span className="absolute right-3 top-3 rounded-xl bg-white/90 px-2.5 py-1 font-display text-[11px] font-extrabold tracking-[.14em] text-ink shadow">
                    WORLD {w.order}
                  </span>
                  {!st.open ? (
                    <span className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-white/95 text-lock shadow">
                      <Lock size={20} strokeWidth={2.6} />
                    </span>
                  ) : null}
                </div>
                <div className="p-5 pt-4">
                  <h2 className="font-display text-[22px] font-extrabold leading-tight">{w.biome}</h2>
                  <p className="text-[13px] font-semibold text-muted">
                    {w.title} — {w.tagline}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Tag>
                      <Layers />
                      {w.stageIds.length} stages
                    </Tag>
                    <Tag>
                      <Map />
                      {w.levelCount} levels
                    </Tag>
                    {st.open ? (
                      <Tag tone="mint">
                        <Sparkles />
                        {st.available} ready
                      </Tag>
                    ) : (
                      <Tag tone="lock">
                        <Lock />
                        Locked
                      </Tag>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <ProgressBar className="flex-1" value={got / max} label={`${w.biome} stars earned`} />
                    <span className="flex items-center gap-1 font-display text-[13px] font-extrabold tabular-nums text-ink-2">
                      <Star size={14} className="fill-gold-2 text-gold-3" aria-hidden />
                      {got}/{max}
                    </span>
                  </div>
                  {!st.open && st.needs.length ? (
                    <p className="mt-3 text-[12px] font-semibold text-muted">
                      Opens after levels in {st.needs.map((n) => n.biome).join(', ')}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
