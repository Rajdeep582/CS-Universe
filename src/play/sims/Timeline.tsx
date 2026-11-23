import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import { useReducedMotion } from 'motion/react';

/** Cursor over a precomputed list of states, with autoplay. */
export function useTimeline(length: number) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduce = useReducedMotion();
  const at = Math.min(i, length - 1);
  // Playback stops by itself at the last state; `running` is derived so no effect has to reset it.
  const running = playing && at < length - 1;
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setI(at + 1), reduce ? 900 : 550);
    return () => clearTimeout(t);
  }, [running, at, reduce]);
  return {
    i: at,
    playing: running,
    set: (n: number) => setI(Math.max(0, Math.min(length - 1, n))),
    reset: () => {
      setPlaying(false);
      setI(0);
    },
    toggle: () => {
      if (running) return setPlaying(false);
      if (at >= length - 1) setI(0);
      setPlaying(true);
    },
    stop: () => setPlaying(false),
  };
}

type T = ReturnType<typeof useTimeline>;

export function TimelineControls({ t, length, label }: { t: T; length: number; label: string }) {
  const btn =
    'grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300';
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={t.reset} aria-label="Reset to start">
        <RotateCcw size={17} />
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => {
          t.stop();
          t.set(t.i - 1);
        }}
        disabled={t.i === 0}
        aria-label="Step back"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        className="grid size-12 place-items-center rounded-full bg-[linear-gradient(180deg,#5eead4,#14b8a6)] text-[#04201c] shadow-[0_6px_18px_-6px_#14b8a6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
        onClick={t.toggle}
        aria-label={t.playing ? 'Pause' : 'Play'}
      >
        {t.playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => {
          t.stop();
          t.set(t.i + 1);
        }}
        disabled={t.i >= length - 1}
        aria-label="Step forward"
      >
        <ChevronRight size={20} />
      </button>
      <input
        type="range"
        min={0}
        max={length - 1}
        value={t.i}
        onChange={(e) => {
          t.stop();
          t.set(Number(e.target.value));
        }}
        aria-label={label}
        aria-valuetext={`Step ${t.i + 1} of ${length}`}
        className="sim-scrub mx-2 min-w-0 flex-1"
      />
      <span className="w-[74px] text-right font-mono text-[12px] tabular-nums text-white/70">
        {t.i + 1} / {length}
      </span>
    </div>
  );
}
