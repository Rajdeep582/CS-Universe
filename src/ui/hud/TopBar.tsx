import { useState } from 'react';
import { CalendarCheck, Flame, Globe2, Map, Repeat, Search, Settings, Star, Trophy } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useLearner, starTotal } from '@/engine/progress/learner';
import { curriculum } from '@/engine/content';
import { useUi } from '@/app/uiStore';
import { useProgress } from '@/app/useProgress';
import { useStreak } from '@/app/useStreak';
import { usePrefs } from '@/engine/progress/settings';
import { IconButton, Kbd, StatChip } from '../components';
import { ProfileCard } from './ProfileCard';
import { SettingsDialog } from './SettingsDialog';

export function TopBar() {
  const xp = useLearner((s) => s.xp);
  const stars = useLearner((s) => s.stars);
  const { cleared, due } = useProgress();
  const streak = useStreak();
  const showStreak = usePrefs((s) => s.showStreak);
  const open = useUi((s) => s.setPaletteOpen);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const inAtlas = path.startsWith('/atlas') || path === '/gallery' || path === '/journey';
  const [settings, setSettings] = useState(false);
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-3 px-6 pt-5">
      <div className="pointer-events-auto flex items-start gap-3">
        <Link to="/" aria-label="World Map" className="rounded-[28px]" data-hud>
          <ProfileCard xp={xp} levelsCleared={cleared.size} />
        </Link>
        <div className="mt-3 hidden gap-3 xl:flex" data-hud>
          <StatChip
            icon={<Star />}
            tone="gold"
            value={starTotal(stars)}
            suffix={` / ${curriculum.stats.maxStars.toLocaleString('en-US')}`}
            label="Stars earned"
          />
          {showStreak ? (
            streak.mode === 'daily' ? (
              <StatChip
                icon={<Flame />}
                tone="fire"
                value={streak.daily.current}
                label={`Day streak · ${streak.daily.freezes} ❄`}
              />
            ) : (
              <StatChip
                icon={<CalendarCheck />}
                tone="fire"
                value={streak.weekly.weeks}
                label={`Week streak · ${streak.weekly.thisWeek}/${streak.target} days`}
              />
            )
          ) : null}
          {due.length ? (
            <Link to="/journey" className="rounded-[22px]" aria-label={`${due.length} reviews due`}>
              <StatChip icon={<Repeat />} tone="sky" value={due.length} label="Reviews due" />
            </Link>
          ) : null}
        </div>
      </div>
      <div className="pointer-events-auto mt-3 flex gap-3" data-hud>
        <button
          type="button"
          onClick={() => open(true)}
          className="glass glass-interactive flex h-16 w-[300px] items-center gap-3 whitespace-nowrap rounded-[22px] px-4 text-sm font-semibold text-muted"
        >
          <Search size={20} aria-hidden className="flex-none" />
          Search worlds, stages, levels
          <span className="ml-auto">
            <Kbd>Ctrl K</Kbd>
          </span>
        </button>
        {inAtlas ? (
          <Link
            to="/"
            aria-label="3D World Map"
            className="glass glass-interactive grid size-16 place-items-center rounded-[22px] text-ink"
          >
            <Globe2 size={26} />
          </Link>
        ) : (
          <Link
            to="/atlas"
            aria-label="2D Atlas"
            className="glass glass-interactive grid size-16 place-items-center rounded-[22px] text-ink"
          >
            <Map size={26} />
          </Link>
        )}
        <Link
          to="/journey"
          aria-label="Journey"
          className="glass glass-interactive grid size-16 place-items-center rounded-[22px] text-ink"
        >
          <Trophy size={26} />
        </Link>
        <IconButton label="Settings" icon={<Settings />} onClick={() => setSettings(true)} />
      </div>
      <SettingsDialog open={settings} onOpenChange={setSettings} />
    </header>
  );
}
