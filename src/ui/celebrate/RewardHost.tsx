import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Award, Sparkles, Target } from 'lucide-react';
import { useLearner, type Reward } from '@/engine/progress/learner';
import { achievementById } from '@/engine/progress/achievements';
import { DAILY_GOALS } from '@/engine/progress/replay';
import { rankFor } from '@/engine/progress/ranks';
import { BigCelebration } from './BigCelebration';
import { RankBadge } from './RankBadge';
import { useCalm } from './useCalm';

interface Toast {
  id: string;
  icon: 'xp' | 'achievement' | 'goal' | 'studied';
  title: string;
  text?: string;
  xp?: number;
}

/**
 * Turns rewards from the event log into the celebration hierarchy:
 * micro (XP chip) → toasts (studied, goals, achievements) → full-screen rank-up.
 * Level clears and mastery are celebrated by their own result screens.
 */
export function RewardHost() {
  const calm = useCalm();
  const [chips, setChips] = useState<{ id: number; xp: number }[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [rank, setRank] = useState<string | null>(null);

  useEffect(() => {
    // Rewards arrive from the store (an external system to this component): subscribe and drain the queue.
    const drain = (rewards: readonly Reward[]) => {
      if (!rewards.length) return;
      // Take the whole queue first, so the store update this causes cannot re-deliver the same rewards.
      const ids = new Set(rewards.map((r) => r.id));
      useLearner.setState((st) => ({ rewards: st.rewards.filter((r) => !ids.has(r.id)) }));
      const chipsAdd: { id: number; xp: number }[] = [];
      const toastsAdd: Toast[] = [];
      let newRank: string | null = null;
      for (const r of rewards as Reward[]) {
        if ((r.event.t === 'step' || r.event.t === 'sim') && r.xp) {
          const goalXp = r.entries
            .filter((e) => e.kind === 'goal' || e.kind === 'studied')
            .reduce((a, e) => a + (e.kind === 'goal' ? e.xp : 25), 0);
          if (r.xp - goalXp > 0) chipsAdd.push({ id: r.id, xp: r.xp - goalXp });
        }
        for (const e of r.entries) {
          if (e.kind === 'studied')
            toastsAdd.push({
              id: `${r.id}s`,
              icon: 'studied',
              title: 'Lesson studied',
              text: 'The level test is open.',
              xp: 25,
            });
          if (e.kind === 'goal') {
            const g = DAILY_GOALS.find((x) => x.id === e.ref)!;
            toastsAdd.push({
              id: `${r.id}g${e.ref}`,
              icon: 'goal',
              title: "Today's goal complete",
              text: g.title,
              xp: e.xp,
            });
          }
          if (e.kind === 'achievement') {
            const a = achievementById.get(e.ref!)!;
            toastsAdd.push({
              id: `${r.id}a${e.ref}`,
              icon: 'achievement',
              title: `Achievement: ${a.title}`,
              text: a.text,
            });
          }
          if (e.kind === 'rank') newRank = e.ref!;
        }
      }
      if (chipsAdd.length) setChips((c) => [...c, ...chipsAdd]);
      if (toastsAdd.length) setToasts((t) => [...t, ...toastsAdd]);
      if (newRank) setRank(newRank);
    };
    drain(useLearner.getState().rewards);
    return useLearner.subscribe((st, prev) => st.rewards !== prev.rewards && drain(st.rewards));
  }, []);

  useEffect(() => {
    if (!chips.length) return;
    const t = setTimeout(() => setChips((c) => c.slice(1)), calm ? 900 : 700);
    return () => clearTimeout(t);
  }, [chips, calm]);
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((x) => x.slice(1)), 3600);
    return () => clearTimeout(t);
  }, [toasts]);

  const r = rank ? rankFor(useLearner.getState().xp) : null;
  return (
    <>
      <div aria-live="polite" className="pointer-events-none fixed left-[150px] top-[96px] z-50">
        <AnimatePresence>
          {chips.slice(0, 1).map((c) => (
            <motion.span
              key={c.id}
              initial={calm ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.8 }}
              animate={calm ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={calm ? { opacity: 0 } : { opacity: 0, y: -26, scale: 0.7 }}
              transition={{ duration: 0.35 }}
              className="xp-chip"
            >
              <Sparkles size={14} aria-hidden /> +{c.xp} XP
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-28 right-6 z-50 flex w-[340px] flex-col gap-2"
      >
        <AnimatePresence>
          {toasts.slice(0, 3).map((t) => (
            <motion.div
              key={t.id}
              layout={!calm}
              initial={calm ? { opacity: 0 } : { opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="glass flex items-start gap-3 rounded-2xl p-3.5"
            >
              <span
                className={`tile ${t.icon === 'achievement' ? 'tile-violet' : t.icon === 'goal' ? 'tile-mint' : 'tile-sky'} size-10 flex-none`}
              >
                {t.icon === 'achievement' ? (
                  <Award size={20} />
                ) : t.icon === 'goal' ? (
                  <Target size={20} />
                ) : (
                  <Sparkles size={20} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[15px] font-bold">{t.title}</span>
                {t.text ? <span className="block text-[12.5px] font-medium text-ink-2">{t.text}</span> : null}
              </span>
              {t.xp ? <span className="font-display text-[14px] font-bold text-gold-4">+{t.xp}</span> : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {rank && r ? (
        <BigCelebration
          tier="rank"
          kicker="RANK UP"
          title={rank}
          text={
            r.next
              ? `Rank ${r.number} of 16. ${(r.next.xp - useLearner.getState().xp).toLocaleString('en-US')} XP to ${r.next.name}.`
              : 'The highest rank in the universe.'
          }
          badge={<RankBadge name={rank} size={TIER_BADGE} />}
          onClose={() => setRank(null)}
        />
      ) : null}
    </>
  );
}
const TIER_BADGE = 170;
