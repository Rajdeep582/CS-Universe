import { Link, useParams } from '@tanstack/react-router';
import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, Gift, Lock, Repeat, Sparkles } from 'lucide-react';
import { levelById, stageById, worldById } from '@/engine/content';
import { missingPrerequisites } from '@/engine/progress/availability';
import { useProgress } from '../useProgress';
import { Breadcrumbs, GlassPanel, LevelMedallion, StarRating, Tag } from '@/ui/components';
import { NotFound } from './NotFound';

function LevelLink({ id }: { id: string }) {
  const { medal } = useProgress();
  const l = levelById.get(id)!;
  const s = stageById.get(l.stageId)!;
  return (
    <li>
      <Link
        to="/atlas/$worldId/$stageId/$levelId"
        params={{ worldId: l.worldId, stageId: l.stageId, levelId: l.id }}
        className="flex items-center gap-3 rounded-[16px] px-2 py-2 hover:bg-white/60"
      >
        <LevelMedallion state={medal(l)} number={l.number} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{l.title}</span>
          <span className="block text-[12px] font-semibold text-muted">
            World {worldById.get(l.worldId)!.order} · {s.title}
          </span>
        </span>
        <ArrowRight size={16} className="text-muted" aria-hidden />
      </Link>
    </li>
  );
}

const STEPS = [
  {
    icon: <BookOpen size={18} />,
    tone: 'tile-sky',
    title: 'Study the lesson',
    text: 'Small steps: hook, intuition, formal model, simulation, worked example, pitfalls.',
  },
  {
    icon: <ClipboardCheck size={18} />,
    tone: 'tile-violet',
    title: 'Pass the level test',
    text: '5–10 questions built only from this lesson. 70% clears the level ★, 90% earns ★★.',
  },
  {
    icon: <Repeat size={18} />,
    tone: 'tile-gold',
    title: 'Pass the review test',
    text: 'Come back after 3+ days and pass a short review to master it ★★★.',
  },
] as const;

export function LevelPage() {
  const { worldId, stageId, levelId } = useParams({ from: '/atlas/$worldId/$stageId/$levelId' });
  const l = levelById.get(levelId);
  const { cleared, medal, starsOf } = useProgress();
  if (!l || l.stageId !== stageId || l.worldId !== worldId) return <NotFound />;
  const s = stageById.get(l.stageId)!;
  const w = worldById.get(l.worldId)!;
  const unit = s.units.find((u) => u.id === l.unitId)!;
  const m = medal(l);
  const missing = missingPrerequisites(l, cleared);
  const host = l.hostLevelId ? levelById.get(l.hostLevelId)! : null;
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Atlas', to: '/' },
          { label: `World ${w.order} · ${w.biome}`, to: '/atlas/$worldId', params: { worldId: w.id } },
          { label: s.title, to: '/atlas/$worldId/$stageId', params: { worldId: w.id, stageId: s.id } },
          { label: l.title },
        ]}
      />
      <GlassPanel className="rise flex items-center gap-6 rounded-[28px] p-7">
        <LevelMedallion state={m} number={l.number} size={96} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs font-extrabold tracking-[.16em] text-gold-4">
            {l.number === null ? 'BONUS LEVEL' : `LEVEL ${l.number}`} · STAGE {w.order}-{s.order}{' '}
            {s.title.toUpperCase()} · UNIT {unit.title.toUpperCase()}
          </p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">{l.title}</h1>
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
            {m === 'current' ? <Tag tone="rose">Next on your Core Path</Tag> : null}
            {l.core ? (
              <Tag>Core Path</Tag>
            ) : (
              <Tag tone="gold">
                <Gift />
                Bonus — side trail from {host ? `level ${host.number}` : 'the road'}
              </Tag>
            )}
            <StarRating stars={starsOf(l.id) as 0 | 1 | 2 | 3} size={18} />
          </div>
        </div>
      </GlassPanel>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <GlassPanel as="section" aria-labelledby="how" className="rise rounded-[24px] p-6">
          <h2 id="how" className="font-display text-[13px] font-extrabold tracking-[.14em] text-muted">
            HOW TO CLEAR THIS LEVEL
          </h2>
          <ol className="mt-4 space-y-4">
            {STEPS.map((st, i) => (
              <li key={st.title} className="flex gap-4">
                <span className={`tile ${st.tone} size-11 flex-none`}>{st.icon}</span>
                <span>
                  <span className="block font-display text-[17px] font-bold">
                    {i + 1}. {st.title}
                  </span>
                  <span className="block text-[13.5px] font-medium text-ink-2">{st.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </GlassPanel>
        <div className="space-y-5">
          <GlassPanel as="section" aria-labelledby="req" className="rise rounded-[24px] p-5">
            <h2 id="req" className="font-display text-[13px] font-extrabold tracking-[.14em] text-muted">
              {l.requires.length
                ? missing.length
                  ? `CLEAR THESE FIRST (${missing.length})`
                  : 'PREREQUISITES — ALL CLEARED'
                : 'PREREQUISITES'}
            </h2>
            {l.requires.length ? (
              <ul className="mt-2">
                {(missing.length ? missing : l.requires).map((id) => (
                  <LevelLink key={id} id={id} />
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13.5px] font-medium text-ink-2">None — this is where the journey starts.</p>
            )}
          </GlassPanel>
          <GlassPanel as="section" aria-labelledby="unl" className="rise rounded-[24px] p-5">
            <h2 id="unl" className="font-display text-[13px] font-extrabold tracking-[.14em] text-muted">
              CLEARING THIS OPENS ({l.unlocks.length})
            </h2>
            {l.unlocks.length ? (
              <ul className="mt-2 max-h-[300px] overflow-y-auto">
                {l.unlocks.map((id) => (
                  <LevelLink key={id} id={id} />
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13.5px] font-medium text-ink-2">
                Nothing directly — this level completes its branch.
              </p>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
