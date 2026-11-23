import { Link } from '@tanstack/react-router';
import {
  Award,
  CalendarClock,
  Castle,
  Globe2,
  Crown,
  Flame,
  Lock,
  Repeat,
  Snowflake,
  Sparkles,
  Star,
  Target,
  Trophy,
} from 'lucide-react';
import { clsx } from 'clsx';
import { levelById, stageById, worldById, curriculum } from '@/engine/content';
import { useLearner, starTotal } from '@/engine/progress/learner';
import { ACHIEVEMENTS, achievementById } from '@/engine/progress/achievements';
import { DAILY_GOALS, MASTERY_GAP_DAYS, XP, type JournalEntry } from '@/engine/progress/replay';
import { RANKS, rankFor } from '@/engine/progress/ranks';
import { addDays, daysBetween } from '@/engine/progress/events';
import { usePrefs } from '@/engine/progress/settings';
import { GlassPanel, LevelMedallion, ProgressBar, StatChip } from '@/ui/components';
import { RankBadge } from '@/ui/celebrate/RankBadge';
import { useProgress } from '../useProgress';
import { useStreak } from '../useStreak';

const H2 = 'font-display text-[13px] font-extrabold tracking-[.14em] text-muted';
const dateFmt = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const dayFmt = (k: string) => dateFmt(new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)));

function entryText(e: JournalEntry): { icon: React.ReactNode; text: string } {
  const lv = e.levelId ? levelById.get(e.levelId) : undefined;
  switch (e.kind) {
    case 'studied':
      return { icon: <Sparkles size={16} />, text: `Studied ${lv?.title ?? e.levelId}` };
    case 'cleared':
      return { icon: <Star size={16} />, text: `Cleared ${lv?.title ?? e.levelId} ★` };
    case 'excellent':
      return { icon: <Star size={16} />, text: `${lv?.title ?? e.levelId} ★★` };
    case 'mastered':
      return { icon: <Crown size={16} />, text: `Mastered ${lv?.title ?? e.levelId} ★★★` };
    case 'boss':
      return { icon: <Castle size={16} />, text: `Beat the ${stageById.get(e.ref!)?.title ?? e.ref} boss` };
    case 'world':
      return { icon: <Globe2 size={16} />, text: `Completed ${worldById.get(e.ref!)?.biome ?? e.ref}` };
    case 'rank':
      return { icon: <Trophy size={16} />, text: `Reached the rank of ${e.ref}` };
    case 'achievement':
      return { icon: <Award size={16} />, text: `Achievement: ${achievementById.get(e.ref!)?.title ?? e.ref}` };
    case 'goal':
      return {
        icon: <Target size={16} />,
        text: `Today's goal: ${DAILY_GOALS.find((g) => g.id === e.ref)?.title ?? e.ref}`,
      };
  }
}

const monday = (k: string) => {
  const dow = (new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10))).getUTCDay() + 6) % 7;
  return addDays(k, -dow);
};

/** Progress overview: rank, stats, streak, today's goals, reviews, achievements, the journey log and how XP works. */
export function JourneyPage() {
  const s = useLearner();
  const prefs = usePrefs();
  const { cleared, due } = useProgress();
  const streak = useStreak();
  const r = rankFor(s.xp);
  const mastered = [...s.levels.values()].filter((l) => l.mastered).length;
  const today = s.days.get(streak.today);
  const upcoming = [...s.levels.entries()]
    .filter(([, l]) => l.card)
    .map(([id, l]) => ({ id, due: l.card!.due }))
    .filter((x) => !due.some((d) => d.levelId === x.id))
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, 5);
  const weeks = new Map<string, JournalEntry[]>();
  for (const e of [...s.journal].reverse().filter((j) => j.kind !== 'goal')) {
    const wk = monday(e.day);
    weeks.set(wk, [...(weeks.get(wk) ?? []), e]);
  }
  const counts = { study: today?.steps ?? 0, clear: today?.clears ?? 0, review: today?.reviews ?? 0 };

  return (
    <div className="space-y-6">
      <GlassPanel className="rise flex flex-wrap items-center gap-6 rounded-[28px] p-7">
        <RankBadge name={r.name} size={112} />
        <div className="min-w-[260px] flex-1">
          <p className="font-display text-xs font-extrabold tracking-[.16em] text-gold-4">
            YOUR JOURNEY · RANK {r.number} OF {RANKS.length}
          </p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">{r.name}</h1>
          <ProgressBar className="mt-3" value={r.progress} tone="xp" label="Progress to next rank" height={12} />
          <p className="mt-1.5 text-[13px] font-semibold text-ink-2">
            {s.xp.toLocaleString('en-US')} XP
            {r.next ? ` · ${(r.next.xp - s.xp).toLocaleString('en-US')} XP to ${r.next.name}` : ' · highest rank'}
          </p>
        </div>
        <ol aria-label="Rank ladder" className="flex w-full flex-wrap gap-1.5">
          {RANKS.map((k, i) => (
            <li
              key={k.name}
              className={clsx(
                'rounded-full px-2.5 py-1 text-[11.5px] font-bold',
                i + 1 < r.number
                  ? 'bg-gold-2/30 text-gold-4'
                  : i + 1 === r.number
                    ? 'bg-gold-2 text-[#7a3b00]'
                    : 'bg-[rgb(11_36_71/.06)] text-muted',
              )}
              aria-current={i + 1 === r.number ? 'step' : undefined}
            >
              {k.name} · {k.xp.toLocaleString('en-US')}
            </li>
          ))}
        </ol>
      </GlassPanel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatChip
          icon={<Star />}
          tone="gold"
          value={starTotal(s.stars)}
          suffix={` / ${curriculum.stats.maxStars.toLocaleString('en-US')}`}
          label="Stars"
        />
        <StatChip
          icon={<Trophy />}
          tone="mint"
          value={cleared.size}
          suffix={` / ${curriculum.stats.levels}`}
          label="Levels cleared"
        />
        <StatChip icon={<Crown />} tone="violet" value={mastered} label="Mastered ★★★" />
        <StatChip icon={<Repeat />} tone="sky" value={s.reviewsPassed} label="Reviews passed" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassPanel as="section" aria-labelledby="streak-h" className="rounded-[24px] p-5">
          <h2 id="streak-h" className={H2}>
            STREAK
          </h2>
          {!prefs.showStreak ? (
            <p className="mt-3 text-[13.5px] font-medium text-ink-2">Streaks are hidden. Turn them on in Settings.</p>
          ) : streak.mode === 'daily' ? (
            <>
              <p className="mt-3 flex items-center gap-3 font-display text-[34px] font-extrabold">
                <Flame className="text-[#ff7a1a]" size={30} aria-hidden /> {streak.daily.current}
                <span className="text-[15px] font-bold text-muted">day{streak.daily.current === 1 ? '' : 's'}</span>
              </p>
              <p className="mt-1 text-[13.5px] font-medium text-ink-2">
                {streak.daily.broken
                  ? `New streak started — your best is ${streak.daily.best} days.`
                  : streak.activeToday
                    ? 'Today counts. See you tomorrow.'
                    : 'Any lesson step, test or review today keeps it going.'}
              </p>
              <p className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-ink-2">
                <Snowflake size={16} className="text-sky-3" aria-hidden /> {streak.daily.freezes} of 3 freezes · best{' '}
                {streak.daily.best} day
                {streak.daily.best === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-[12px] font-medium text-muted">
                A freeze is earned every 7 days and covers a missed day automatically.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 font-display text-[34px] font-extrabold">
                {streak.weekly.weeks} <span className="text-[15px] font-bold text-muted">weeks</span>
              </p>
              <p className="mt-1 text-[13.5px] font-medium text-ink-2">
                This week: {streak.weekly.thisWeek} of {streak.target} days.
              </p>
            </>
          )}
        </GlassPanel>

        <GlassPanel as="section" aria-labelledby="goals-h" className="rounded-[24px] p-5">
          <h2 id="goals-h" className={H2}>
            TODAY&apos;S GOALS
          </h2>
          {prefs.dailyGoals ? (
            <ul className="mt-3 space-y-3">
              {DAILY_GOALS.map((g) => {
                const done = today?.goals.has(g.id) ?? false;
                const v = Math.min(g.target, counts[g.id]);
                return (
                  <li key={g.id}>
                    <p className="flex justify-between text-[13.5px] font-semibold">
                      <span className={clsx(done && 'text-mint-3')}>
                        {done ? '✓ ' : ''}
                        {g.title}
                      </span>
                      <span className="text-gold-4">+{g.xp} XP</span>
                    </p>
                    <ProgressBar
                      className="mt-1"
                      value={v / g.target}
                      tone="mint"
                      label={`${g.title}: ${v} of ${g.target}`}
                      height={8}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-[13.5px] font-medium text-ink-2">Daily goals are off. Turn them on in Settings.</p>
          )}
          <p className="mt-3 text-[12px] font-medium text-muted">
            Optional. They reset at midnight; missing them costs nothing.
          </p>
        </GlassPanel>

        <GlassPanel as="section" aria-labelledby="rev-h" className="rounded-[24px] p-5">
          <h2 id="rev-h" className={H2}>
            REVIEWS {due.length ? `DUE (${due.length})` : ''}
          </h2>
          {due.length ? (
            <ul className="mt-2 space-y-1">
              {due.map((d) => {
                const l = levelById.get(d.levelId)!;
                return (
                  <li key={d.levelId}>
                    <Link
                      to="/play/$levelId"
                      params={{ levelId: l.id }}
                      search={{ review: true }}
                      className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-white/60"
                    >
                      <LevelMedallion state="cleared" number={l.number} size={34} due />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{l.title}</span>
                        <span className="block text-[12px] font-semibold text-muted">
                          {stageById.get(l.stageId)!.title}
                        </span>
                      </span>
                      <Repeat size={16} className="text-sky-3" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-[13.5px] font-medium text-ink-2">
              {s.levels.size && upcoming.length
                ? 'Nothing due right now.'
                : 'Clear a level and its first review is scheduled.'}
            </p>
          )}
          {upcoming.length ? (
            <>
              <h3 className="mt-4 text-[12px] font-bold text-muted">COMING UP</h3>
              <ul className="mt-1 space-y-1 text-[13px] font-semibold text-ink-2">
                {upcoming.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{levelById.get(u.id)?.title ?? u.id}</span>
                    <span className="flex flex-none items-center gap-1.5 text-muted">
                      <CalendarClock size={14} aria-hidden /> {dateFmt(u.due)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="mt-3 text-[12px] font-medium text-muted">
            At most {prefs.reviewCap} a day; extras roll over without penalty.
          </p>
        </GlassPanel>
      </div>

      <GlassPanel as="section" aria-labelledby="ach-h" className="rounded-[24px] p-6">
        <h2 id="ach-h" className={H2}>
          ACHIEVEMENTS · {s.achievements.size} OF {ACHIEVEMENTS.length}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const at = s.achievements.get(a.id);
            const secret = a.hidden && !at;
            return (
              <li
                key={a.id}
                className={clsx(
                  'flex items-start gap-3 rounded-2xl border p-3',
                  at ? 'border-gold-2/60 bg-white/70' : 'border-line bg-white/35',
                )}
              >
                <span className={clsx('tile size-11 flex-none', at ? 'tile-gold' : 'tile-lock')}>
                  {at ? <Award size={22} /> : <Lock size={20} />}
                </span>
                <span>
                  <span className={clsx('block font-display text-[15px] font-bold', !at && 'text-ink-2')}>
                    {secret ? 'Hidden achievement' : a.title}
                  </span>
                  <span className="block text-[12.5px] font-medium text-ink-2">
                    {secret ? 'Keep exploring to discover it.' : a.text}
                  </span>
                  {at ? (
                    <span className="mt-0.5 block text-[11.5px] font-bold text-gold-4">{dateFmt(new Date(at))}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </GlassPanel>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <GlassPanel as="section" aria-labelledby="log-h" className="rounded-[24px] p-6">
          <h2 id="log-h" className={H2}>
            JOURNEY LOG
          </h2>
          {weeks.size ? (
            <div className="mt-3 space-y-5">
              {[...weeks.entries()].map(([wk, entries]) => (
                <section key={wk} aria-label={`Week of ${dayFmt(wk)}`}>
                  <h3 className="text-[12px] font-extrabold tracking-wider text-muted">
                    {daysBetween(wk, monday(streak.today)) === 0 ? 'THIS WEEK' : `WEEK OF ${dayFmt(wk).toUpperCase()}`}
                  </h3>
                  <ol className="mt-1.5 space-y-1">
                    {entries.map((e, i) => {
                      const t = entryText(e);
                      return (
                        <li
                          key={`${e.at}-${i}`}
                          className="flex items-center gap-3 rounded-xl px-1 py-1 text-[14px] font-semibold"
                        >
                          <span className="grid size-7 flex-none place-items-center rounded-full bg-gold-2/25 text-gold-4">
                            {t.icon}
                          </span>
                          <span className="flex-1">{t.text}</span>
                          <span className="text-[12px] font-semibold text-muted">{dayFmt(e.day)}</span>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[13.5px] font-medium text-ink-2">
              Your clears, stars, ranks and achievements will appear here.
            </p>
          )}
        </GlassPanel>
        <GlassPanel as="section" aria-labelledby="xp-h" className="rounded-[24px] p-6">
          <h2 id="xp-h" className={H2}>
            HOW XP WORKS
          </h2>
          <table className="mt-3 w-full text-[13px]">
            <tbody className="[&_td]:py-1 [&_td:last-child]:text-right [&_td:last-child]:font-bold [&_td:last-child]:text-gold-4 [&_tr+tr]:border-t [&_tr+tr]:border-line">
              <tr>
                <td>Lesson step (first time)</td>
                <td>{XP.step}</td>
              </tr>
              <tr>
                <td>Lesson studied (all steps)</td>
                <td>+{XP.studied}</td>
              </tr>
              <tr>
                <td>Simulation goal</td>
                <td>{XP.simGoal}</td>
              </tr>
              <tr>
                <td>Test answer right (first attempt / later)</td>
                <td>
                  {XP.itemFirst} / {XP.itemRetry}
                </td>
              </tr>
              <tr>
                <td>Level cleared (≥ 70 %)</td>
                <td>+{XP.cleared}</td>
              </tr>
              <tr>
                <td>Second star (≥ 90 %)</td>
                <td>+{XP.secondStar}</td>
              </tr>
              <tr>
                <td>Review passed</td>
                <td>{XP.review}</td>
              </tr>
              <tr>
                <td>Mastered (review ≥ {MASTERY_GAP_DAYS} days after clearing)</td>
                <td>+{XP.mastered}</td>
              </tr>
              <tr>
                <td>Stage boss beaten (boss + stage)</td>
                <td>+{XP.boss + XP.stage}</td>
              </tr>
              <tr>
                <td>World complete (all stage bosses)</td>
                <td>+{XP.world}</td>
              </tr>
              <tr>
                <td>Today&apos;s goal</td>
                <td>50–60</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-[12px] font-medium text-muted">
            Every reward is fixed and listed here. XP never decays and cannot be bought.
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}
