import { Flame, Search, Snowflake, Star } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useLearner, starTotal } from '@/engine/progress/learner';
import { curriculum } from '@/engine/content';
import { useUi } from '@/app/uiStore';
import { useProgress } from '@/app/useProgress';
import { Kbd, StatChip } from '../components';
import { ProfileCard } from './ProfileCard';

export function TopBar() {
  const { xp, streakDays, freezes, stars } = useLearner();
  const { cleared } = useProgress();
  const open = useUi((s) => s.setPaletteOpen);
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-3 px-6 pt-5">
      <div className="pointer-events-auto flex items-start gap-3">
        <Link to="/" aria-label="Atlas home" className="rounded-[28px]">
          <ProfileCard xp={xp} levelsCleared={cleared.size} />
        </Link>
        <div className="mt-3 hidden gap-3 xl:flex">
          <StatChip
            icon={<Star />}
            tone="gold"
            value={starTotal(stars)}
            suffix={` / ${curriculum.stats.maxStars.toLocaleString('en-US')}`}
            label="Stars earned"
          />
          <StatChip icon={<Flame />} tone="fire" value={streakDays} label="Day streak" />
          <StatChip icon={<Snowflake />} tone="ice" value={freezes} label="Freezes" />
        </div>
      </div>
      <button
        type="button"
        onClick={() => open(true)}
        className="glass glass-interactive pointer-events-auto mt-3 flex h-16 w-[320px] items-center gap-3 whitespace-nowrap rounded-[22px] px-4 text-sm font-semibold text-muted"
      >
        <Search size={20} aria-hidden />
        Search worlds, stages, levels
        <span className="ml-auto">
          <Kbd>Ctrl K</Kbd>
        </span>
      </button>
    </header>
  );
}
