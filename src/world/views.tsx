import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import {
  ArrowLeft,
  BookOpen,
  Castle,
  CheckCircle2,
  ClipboardCheck,
  Gift,
  Lock,
  Map,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  curriculum,
  levelById,
  levelsOfStage,
  levelsOfWorld,
  stageById,
  stageCode,
  worldById,
  type Level,
} from '@/engine/content';
import { missingPrerequisites } from '@/engine/progress/availability';
import { useProgress } from '@/app/useProgress';
import { stageStatus, worldStatus } from '@/app/derive';
import { LevelMedallion, ProgressBar, StarRating, Tag } from '@/ui/components';
import { NotFound } from '@/app/routes/NotFound';
import { Label } from './labels';
import { useStageLayout, useWorldLayout } from './useWorldData';
import { useViewStore } from './viewStore';

const panel = 'glass pointer-events-auto';

function BackButton({
  to,
  params,
  label,
}: {
  to: '/' | '/world/$worldId';
  params?: { worldId: string };
  label: string;
}) {
  return (
    <Link
      data-hud
      to={to}
      params={params as never}
      className={clsx(
        panel,
        'fixed left-6 top-[140px] z-30 flex h-14 items-center gap-2.5 rounded-[20px] pl-2.5 pr-5 font-display text-[15px] font-extrabold',
      )}
    >
      <span className="tile tile-sky size-9">
        <ArrowLeft size={18} />
      </span>
      {label}
    </Link>
  );
}

// ───────────────────────── World Map ─────────────────────────

export function WorldMapView() {
  const wl = useWorldLayout();
  const { cleared, stars, next } = useProgress();
  const hovered = useViewStore((s) => s.hovered);
  const home = wl.islands.find((i) => i.world.id === next?.worldId);
  const total = curriculum.stats.maxStars;
  const got = [...stars.values()].reduce<number>((a, b) => a + b, 0);
  const open = curriculum.worlds.filter((w) => worldStatus(w, cleared).open).length;
  return (
    <>
      <h1 className="sr-only">World Map — Isles of Computing</h1>
      {wl.islands.map((i) => {
        const w = i.world;
        const st = worldStatus(w, cleared);
        const s = levelsOfWorld(w.id).reduce((n, l) => n + (stars.get(l.id) ?? 0), 0);
        const max = w.levelCount * 3;
        return (
          <Label
            key={w.id}
            id={`world:${w.id}`}
            position={[i.spec.x, 0, i.spec.z + i.spec.rz * 1.02]}
            anchor="below"
            priority={st.open ? 60 : 40}
          >
            <Link
              to="/world/$worldId"
              params={{ worldId: w.id }}
              aria-label={`World ${w.order}: ${w.biome}${st.open ? '' : ', locked'}`}
              className={clsx(
                panel,
                'block min-w-[186px] rounded-[18px] px-3.5 py-2.5 transition-shadow',
                !st.open && 'bg-[linear-gradient(180deg,rgb(232_238_248/.78),rgb(210_220_236/.64))]',
                (hovered === `world:${w.id}` || w.id === next?.worldId) &&
                  'shadow-[0_0_0_3px_#fff,0_0_0_6px_rgb(34_211_238/.75),0_0_36px_rgb(34_211_238/.6)]',
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className="whitespace-nowrap rounded-lg px-2 py-0.5 font-display text-[10.5px] font-extrabold tracking-[.12em] text-white shadow-[inset_0_1px_0_rgb(255_255_255/.5)]"
                  style={{
                    background: st.open
                      ? `linear-gradient(180deg, ${w.color}, color-mix(in oklab, ${w.color} 60%, #0b2447))`
                      : '#93a1b8',
                  }}
                >
                  WORLD {w.order}
                </span>
                <span className="whitespace-nowrap text-[11px] font-semibold text-muted">{w.title}</span>
              </span>
              <span
                className={clsx(
                  'mt-1 block whitespace-nowrap font-display text-[17.5px] font-extrabold',
                  !st.open && 'text-[#51627e]',
                )}
              >
                {w.biome}
              </span>
              {st.open ? (
                <span className="mt-1.5 flex items-center gap-2">
                  <ProgressBar className="flex-1" value={s / max} height={8} label={`${w.biome} stars`} />
                  <span className="flex items-center gap-1 font-display text-[12.5px] font-extrabold tabular-nums text-ink-2">
                    <Star size={13} className="fill-gold-2 text-gold-3" aria-hidden />
                    {s}/{max}
                  </span>
                </span>
              ) : (
                <span className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-[#6b7c99]">
                  <Lock size={12} aria-hidden /> Locked · {w.levelCount} levels
                </span>
              )}
            </Link>
          </Label>
        );
      })}
      {home ? (
        <Label
          id="you"
          position={[home.spec.x + home.spec.rx * 1.05, 11, home.spec.z + 10]}
          anchor="above"
          priority={100}
        >
          <span className="flex flex-col items-center">
            <span className="rounded-xl border-2 border-white bg-gradient-to-b from-rose-1 to-rose-2 px-3 py-1.5 font-display text-xs font-extrabold tracking-[.12em] text-white shadow-[0_8px_18px_-4px_rgb(179_18_95/.6)]">
              YOU ARE HERE
            </span>
            <span className="h-6 w-[3px] bg-gradient-to-b from-white to-transparent" />
          </span>
        </Label>
      ) : null}
      <section
        data-hud
        aria-label="Atlas progress"
        className={clsx(panel, 'fixed bottom-7 right-6 z-30 w-[330px] rounded-[24px] px-[18px] py-4')}
      >
        <p className="flex justify-between font-display text-sm font-extrabold tracking-wide">
          ATLAS{' '}
          <span className="font-sans text-[11px] font-semibold text-muted">
            {((got / total) * 100).toFixed(1)}% of stars · {open} / {curriculum.worlds.length} worlds open
          </span>
        </p>
        <div className="mt-2.5 flex gap-1">
          {curriculum.worlds.map((w) => {
            const st = worldStatus(w, cleared);
            return (
              <i
                key={w.id}
                title={w.biome}
                className="h-2.5 flex-1 rounded-[5px] shadow-[inset_0_1px_2px_rgb(0_0_0/.18)]"
                style={{
                  background: st.open ? w.color : '#d3dbe7',
                  opacity: st.open ? 0.4 + 0.6 * (st.cleared / st.total) : 1,
                }}
              />
            );
          })}
        </div>
        <Link
          to="/atlas"
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-sky-3 hover:underline"
        >
          <Map size={14} aria-hidden /> Open the 2D Atlas
        </Link>
      </section>
    </>
  );
}

// ───────────────────────── Island ─────────────────────────

export function IslandView() {
  const { worldId } = useParams({ from: '/_world/world/$worldId' });
  const w = worldById.get(worldId);
  const wl = useWorldLayout();
  const sampler = useViewStore((s) => (s.samplerKey === 'world' ? s.sampler : null));
  const hovered = useViewStore((s) => s.hovered);
  const { cleared } = useProgress();
  if (!w) return <NotFound />;
  const isl = wl.islands.find((i) => i.world.id === w.id)!;
  const ws = worldStatus(w, cleared);
  return (
    <>
      <BackButton to="/" label="WORLD MAP" />
      <header
        data-hud
        className={clsx(
          panel,
          'fixed left-1/2 top-[132px] z-30 min-w-[480px] -translate-x-1/2 rounded-[24px] px-7 pb-3.5 pt-3 text-center',
        )}
      >
        <p className="font-display text-[11px] font-extrabold tracking-[.16em] text-gold-4">
          WORLD {w.order} · {w.title.toUpperCase()} · {w.stageIds.length} STAGES
        </p>
        <h1 className="font-display text-[28px] font-extrabold">{w.biome}</h1>
        <div className="mt-1.5 flex items-center justify-center gap-2.5 text-[12px] font-bold text-ink-2">
          <ProgressBar
            className="w-[200px]"
            value={ws.cleared / ws.total}
            tone="mint"
            label={`${w.biome} levels cleared`}
          />
          {ws.cleared} / {ws.total} levels cleared
        </div>
      </header>
      <nav
        data-hud
        aria-label={`Stages of ${w.biome}`}
        className={clsx(panel, 'fixed left-6 top-[212px] z-30 w-[330px] rounded-[24px] p-3')}
      >
        <p className="px-2 pb-1 pt-1 font-display text-[11px] font-extrabold tracking-[.14em] text-muted">
          STAGES IN ORDER
        </p>
        <ol>
          {w.stageIds.map((id) => {
            const s = stageById.get(id)!;
            const st = stageStatus(s, cleared);
            return (
              <li key={id}>
                <Link
                  to="/world/$worldId/$stageId"
                  params={{ worldId: w.id, stageId: s.id }}
                  search={{}}
                  aria-label={`Stage ${stageCode(s)}: ${s.title}${st.open ? '' : ', locked'}`}
                  className={clsx(
                    'flex items-center gap-3 rounded-[16px] px-2 py-2 transition-colors hover:bg-white/60',
                    hovered === `stage:${s.id}` && 'bg-white/70',
                  )}
                >
                  <span
                    className={clsx(
                      'tile size-10 flex-none font-display text-[13px] font-extrabold',
                      st.open ? 'tile-sky' : 'tile-lock',
                    )}
                  >
                    {stageCode(s)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[14.5px] font-extrabold">{s.title}</span>
                    <span className="block text-[11.5px] font-semibold text-muted">
                      {s.levelCount} levels · {st.open ? `${st.available} ready · ${st.cleared} cleared` : 'Locked'}
                    </span>
                  </span>
                  {!st.open ? <Lock size={15} className="text-lock" aria-hidden /> : null}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
      {sampler
        ? isl.stageSpots.map((spot) => {
            const s = stageById.get(spot.stageId)!;
            const st = stageStatus(s, cleared);
            const hot = hovered === `stage:${s.id}`;
            return (
              <Label
                key={s.id}
                id={`stage:${s.id}`}
                position={[spot.x, sampler(spot.x, spot.z) + 5.5, spot.z]}
                anchor="above"
                offset={6}
                priority={hot ? 95 : st.open ? 70 : 50}
              >
                <Link
                  to="/world/$worldId/$stageId"
                  params={{ worldId: w.id, stageId: s.id }}
                  search={{}}
                  tabIndex={-1}
                  aria-hidden
                  className={clsx(
                    panel,
                    'flex items-center gap-2 rounded-[14px] py-1 pl-1 pr-1',
                    (hot || st.open) && 'pr-3',
                  )}
                >
                  <span
                    className={clsx(
                      'tile size-8 font-display text-[12px] font-extrabold',
                      st.open ? 'tile-sky' : 'tile-lock',
                    )}
                  >
                    {stageCode(s)}
                  </span>
                  {hot || st.open ? (
                    <span className="whitespace-nowrap font-display text-[13px] font-extrabold">{s.title}</span>
                  ) : null}
                </Link>
              </Label>
            );
          })
        : null}
    </>
  );
}

// ───────────────────────── Stage ─────────────────────────

function nameVisible(l: Level, state: string, selected: string | null, hovered: string | null, small: boolean) {
  return small || state === 'current' || selected === l.id || hovered === `level:${l.id}`;
}

export function StageView() {
  const { worldId, stageId } = useParams({ from: '/_world/world/$worldId/$stageId' });
  const { level } = useSearch({ from: '/_world/world/$worldId/$stageId' });
  const s = stageById.get(stageId);
  const L = useStageLayout(s?.id);
  const sampler = useViewStore((st) => (st.samplerKey === `stage:${stageId}` ? st.sampler : null));
  const hovered = useViewStore((st) => st.hovered);
  const { medal, cleared, starsOf } = useProgress();
  if (!s || !L || s.worldId !== worldId) return <NotFound />;
  const w = worldById.get(s.worldId)!;
  const st = stageStatus(s, cleared);
  const levels = levelsOfStage(s.id);
  const small = s.coreLevelCount <= 10;
  const selected = level ?? null;
  return (
    <>
      <BackButton to="/world/$worldId" params={{ worldId: w.id }} label={w.biome.toUpperCase()} />
      <header
        data-hud
        className={clsx(
          panel,
          'fixed left-1/2 top-[132px] z-30 min-w-[500px] -translate-x-1/2 rounded-[24px] px-7 pb-3.5 pt-3 text-center',
        )}
      >
        <p className="font-display text-[11px] font-extrabold tracking-[.16em] text-gold-4">
          WORLD {w.order} · {w.biome.toUpperCase()} · STAGE {s.order} OF {w.stageIds.length}
        </p>
        <h1 className="font-display text-[28px] font-extrabold">{s.title}</h1>
        <div className="mt-1.5 flex items-center justify-center gap-2.5 text-[12px] font-bold text-ink-2">
          <ProgressBar
            className="w-[180px]"
            value={st.cleared / st.total}
            tone="mint"
            label={`${s.title} levels cleared`}
          />
          {st.cleared}/{st.total} cleared · {s.coreLevelCount} road levels · {s.levelCount - s.coreLevelCount} bonus ·{' '}
          {s.units.length} units
        </div>
      </header>
      {sampler ? (
        <>
          {L.pedestals.map((p) => {
            const l = levelById.get(p.levelId)!;
            const m = medal(l);
            const y = sampler(p.x, p.z);
            const pri =
              m === 'current' ? 99 : selected === l.id ? 98 : m === 'available' ? 90 : m === 'cleared' ? 88 : 85;
            return (
              <Label key={l.id} id={`level:${l.id}`} position={[p.x, y + 1.2, p.z]} anchor="center" priority={pri}>
                <Link
                  to="/world/$worldId/$stageId"
                  params={{ worldId: w.id, stageId: s.id }}
                  search={{ level: l.id }}
                  className={clsx(
                    'pointer-events-auto block rounded-full transition-transform hover:scale-110',
                    selected === l.id && 'scale-110',
                  )}
                  aria-label={`Level ${l.number}: ${l.title}, ${m === 'current' ? 'up next' : m}`}
                >
                  <LevelMedallion state={m} number={l.number} size={m === 'current' ? 58 : 48} />
                </Link>
              </Label>
            );
          })}
          {L.pedestals.map((p) => {
            const l = levelById.get(p.levelId)!;
            const m = medal(l);
            if (!nameVisible(l, m, selected, hovered, small)) return null;
            return (
              <Label
                key={`n-${l.id}`}
                id={`name:${l.id}`}
                position={[p.x, sampler(p.x, p.z), p.z + 3.2]}
                anchor="below"
                offset={6}
                priority={m === 'current' ? 80 : 40}
              >
                <span
                  className={clsx(
                    'glass block max-w-[132px] rounded-xl px-2 py-1 text-center text-[11.5px] font-bold leading-tight',
                    m === 'locked' && 'text-[#51627e]',
                  )}
                >
                  {l.title}
                  {m === 'cleared' ? (
                    <span className="mt-0.5 flex justify-center">
                      <StarRating stars={starsOf(l.id) as 1 | 2 | 3} size={12} />
                    </span>
                  ) : null}
                </span>
              </Label>
            );
          })}
          {L.chests.map((c) => {
            const l = levelById.get(c.levelId)!;
            const m = medal(l);
            return (
              <Label
                key={c.levelId}
                id={`chest:${c.levelId}`}
                position={[c.x, sampler(c.x, c.z) + 3.2, c.z]}
                anchor="above"
                offset={4}
                priority={hovered === `level:${l.id}` || selected === l.id ? 97 : 30}
              >
                <Link
                  to="/world/$worldId/$stageId"
                  params={{ worldId: w.id, stageId: s.id }}
                  search={{ level: l.id }}
                  aria-label={`Bonus level: ${l.title}, ${m}`}
                  className="glass pointer-events-auto flex items-center gap-1.5 rounded-xl px-2 py-1 text-[11px] font-extrabold text-gold-4"
                >
                  {m === 'locked' ? <Lock size={12} aria-hidden /> : <Gift size={12} aria-hidden />}
                  {hovered === `level:${l.id}` || selected === l.id ? l.title : 'BONUS'}
                </Link>
              </Label>
            );
          })}
          {L.signposts.map((g) => (
            <Label
              key={g.unitId}
              id={`unit:${g.unitId}`}
              position={[g.x, sampler(g.x, g.z) + 4, g.z]}
              anchor="above"
              offset={2}
              priority={45}
            >
              <span className="glass-dark block whitespace-nowrap rounded-lg px-2 py-1 text-[10.5px] font-extrabold tracking-[.1em]">
                UNIT {g.index + 1} · {g.title.toUpperCase()}
              </span>
            </Label>
          ))}
          <Label
            id="boss"
            position={[L.castle.x, sampler(L.castle.x, L.castle.z) + 22, L.castle.z]}
            anchor="above"
            priority={86}
          >
            <Link
              to="/world/$worldId/$stageId"
              params={{ worldId: w.id, stageId: s.id }}
              search={{ level: '__boss' }}
              className="glass pointer-events-auto flex items-center gap-2 rounded-2xl py-1.5 pl-1.5 pr-3.5"
            >
              <span className="tile tile-rose size-9">
                <Castle size={18} />
              </span>
              <span>
                <span className="block font-display text-[10px] font-extrabold tracking-[.16em] text-rose-2">BOSS</span>
                <span className="block whitespace-nowrap font-display text-[14px] font-extrabold">{s.boss.title}</span>
              </span>
            </Link>
          </Label>
        </>
      ) : null}
      {selected ? <LevelPanel stageId={s.id} levelId={selected} /> : null}
      <span className="sr-only">
        {levels.length} levels in {s.title}
      </span>
    </>
  );
}

function LevelPanel({ stageId, levelId }: { stageId: string; levelId: string }) {
  const navigate = useNavigate();
  const { medal, cleared, starsOf } = useProgress();
  const s = stageById.get(stageId)!;
  const w = worldById.get(s.worldId)!;
  const close = () =>
    void navigate({ to: '/world/$worldId/$stageId', params: { worldId: w.id, stageId: s.id }, search: {} });
  const shell = (children: React.ReactNode, title: string) => (
    <aside
      data-hud
      aria-label={title}
      className={clsx(
        panel,
        'rise fixed right-6 top-[132px] z-30 max-h-[calc(100vh-260px)] w-[380px] overflow-y-auto rounded-[26px] p-5',
      )}
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-muted hover:bg-[rgb(11_36_71/.06)]"
      >
        <X size={18} />
      </button>
      {children}
    </aside>
  );
  if (levelId === '__boss') {
    const core = levelsOfStage(s.id).filter((l) => l.core);
    const done = core.filter((l) => cleared.has(l.id)).length;
    return shell(
      <>
        <span className="tile tile-rose size-14">
          <Castle size={28} />
        </span>
        <p className="mt-3 font-display text-[11px] font-extrabold tracking-[.16em] text-rose-2">
          STAGE BOSS · {s.title.toUpperCase()}
        </p>
        <h2 className="font-display text-2xl font-extrabold">{s.boss.title}</h2>
        <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-ink-2">{s.boss.description}</p>
        <p className="mt-3 flex items-center gap-2 text-[12.5px] font-bold text-rose-3">
          <Lock size={15} aria-hidden />{' '}
          {done === core.length
            ? 'Unlocked'
            : `Clear all ${core.length} road levels to unlock (${done}/${core.length})`}
        </p>
      </>,
      'Boss details',
    );
  }
  const l = levelById.get(levelId);
  if (!l || l.stageId !== s.id) return null;
  const m = medal(l);
  const missing = missingPrerequisites(l, cleared);
  const unit = s.units.find((u) => u.id === l.unitId)!;
  return shell(
    <>
      <div className="flex items-center gap-4">
        <LevelMedallion state={m} number={l.number} size={64} />
        <div>
          <p className="pr-8 font-display text-[10.5px] font-extrabold tracking-[.16em] text-gold-4">
            {l.number === null ? 'BONUS LEVEL' : `LEVEL ${l.number}`} · UNIT {unit.title.toUpperCase()}
          </p>
          <h2 className="pr-6 font-display text-[22px] font-extrabold leading-tight">{l.title}</h2>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {m === 'locked' ? (
          <Tag tone="lock">
            <Lock />
            Locked
          </Tag>
        ) : m === 'cleared' ? (
          <Tag tone="mint">
            <CheckCircle2 />
            Cleared
          </Tag>
        ) : (
          <Tag tone="mint">
            <Sparkles />
            Ready to play
          </Tag>
        )}
        {m === 'current' ? <Tag tone="rose">Next on your path</Tag> : null}
        <StarRating stars={starsOf(l.id) as 0 | 1 | 2 | 3} size={16} />
      </div>
      <p className="mt-4 flex gap-2.5 text-[13px] font-medium text-ink-2">
        <ClipboardCheck size={18} className="mt-0.5 flex-none text-[#8b5cf6]" aria-hidden />
        Clear it by passing its level test (≥ 70 %), built only from this level&apos;s lesson.
      </p>
      <h3 className="mt-4 font-display text-[12px] font-extrabold tracking-[.14em] text-muted">
        {missing.length ? `CLEAR THESE FIRST (${missing.length})` : 'PREREQUISITES'}
      </h3>
      <ul className="mt-1.5 space-y-1">
        {(missing.length ? missing : l.requires).map((id) => {
          const r = levelById.get(id)!;
          const rs = stageById.get(r.stageId)!;
          return (
            <li key={id}>
              <Link
                to="/world/$worldId/$stageId"
                params={{ worldId: r.worldId, stageId: r.stageId }}
                search={{ level: r.id }}
                className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 hover:bg-white/60"
              >
                <LevelMedallion state={medal(r)} number={r.number} size={30} />
                <span>
                  <span className="block text-[13.5px] font-semibold">{r.title}</span>
                  <span className="block text-[11.5px] font-semibold text-muted">
                    {rs.id === s.id ? 'This stage' : `World ${worldById.get(rs.worldId)!.order} · ${rs.title}`}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {!l.requires.length ? <li className="text-[13px] font-medium text-ink-2">None — start here.</li> : null}
      </ul>
      <p className="mt-3 text-[12.5px] font-semibold text-muted">
        Clearing it opens {l.unlocks.length} level{l.unlocks.length === 1 ? '' : 's'}.
      </p>
      <Link
        to="/atlas/$worldId/$stageId/$levelId"
        params={{ worldId: w.id, stageId: s.id, levelId: l.id }}
        className="gem gem-sky gem-sm mt-4 w-full"
      >
        <BookOpen size={16} /> Level details
      </Link>
    </>,
    `Level details: ${l.title}`,
  );
}
