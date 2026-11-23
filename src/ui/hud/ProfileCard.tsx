import { rankFor, RANKS } from '@/engine/progress/ranks';
import { ProgressBar } from '../components';

export function ProfileCard({ xp, levelsCleared }: { xp: number; levelsCleared: number }) {
  const r = rankFor(xp);
  return (
    <section aria-label="Your rank" className="glass flex h-24 w-[420px] items-center gap-4 rounded-[28px] pl-3.5 pr-5">
      <div
        className="relative grid size-[72px] flex-none place-items-center rounded-full p-[5px]"
        style={{
          background: `conic-gradient(from -90deg, #22d3ee 0 ${r.progress * 100}%, rgb(11 36 71 / .12) ${r.progress * 100}% 100%)`,
        }}
      >
        <div className="grid size-full place-items-center rounded-full border-[3px] border-white bg-[radial-gradient(circle_at_35%_30%,#fff_0,#fff3a8_18%,#ffcf3a_55%,#f59e0b_100%)] font-display text-[26px] font-extrabold text-[#7a3b00] shadow-[inset_0_-6px_12px_rgba(122,59,0,.25)]">
          {r.number}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="bg-gradient-to-b from-[#ffb020] to-[#e2650c] bg-clip-text font-display text-[22px] font-extrabold uppercase tracking-wide text-transparent">
            {r.name}
            <span className="ml-1.5 font-sans text-xs font-semibold normal-case tracking-normal text-muted">
              Rank {r.number} of {RANKS.length}
            </span>
          </p>
          <p className="text-xs font-bold tabular-nums text-ink-2">{xp.toLocaleString('en-US')} XP</p>
        </div>
        <ProgressBar
          className="mt-2"
          value={r.progress}
          tone="xp"
          height={14}
          segments
          label={`Progress to ${r.next?.name ?? 'max rank'}`}
        />
        <p className="mt-1.5 text-[11.5px] font-semibold text-muted">
          {r.next ? (
            <>
              {(r.next.xp - xp).toLocaleString('en-US')} XP to <b className="text-ink">{r.next.name}</b>
            </>
          ) : (
            'Highest rank reached'
          )}{' '}
          · {levelsCleared} {levelsCleared === 1 ? 'level' : 'levels'} cleared
        </p>
      </div>
    </section>
  );
}
