import { useState } from 'react';
import { Flame, Gift, Lock, Play, Repeat, Search, Settings, Snowflake, Star, Target, Trophy, Zap } from 'lucide-react';
import {
  GemButton,
  GlassPanel,
  IconButton,
  Kbd,
  LevelMedallion,
  Modal,
  ProgressBar,
  ProgressRing,
  StarRating,
  StatChip,
  Tag,
} from '@/ui/components';
import type { ReactNode } from 'react';
import { SimulationFrame } from '@/play/mdx';
import '@/play/play.css';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GlassPanel as="section" className="rounded-[24px] p-6">
      <h2 className="mb-4 font-display text-[13px] font-extrabold tracking-[.14em] text-muted">
        {title.toUpperCase()}
      </h2>
      {children}
    </GlassPanel>
  );
}

const SWATCHES = ['ink', 'ink-2', 'muted', 'gold-2', 'gold-3', 'mint-2', 'rose-2', 'sky-2', 'sky-3', 'lock'];

/** Design-system gallery: every UI kit component in every state (used for visual review and E2E screenshots). */
export function Gallery() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-5">
      <GlassPanel className="rounded-[28px] p-7">
        <p className="font-display text-xs font-extrabold tracking-[.16em] text-gold-4">DESIGN SYSTEM</p>
        <h1 className="font-display text-4xl font-extrabold">UI kit gallery</h1>
        <p className="mt-1 font-medium text-ink-2">
          Glass surfaces, gem buttons, counters, progress, medallions and stars — Isles of Computing.
        </p>
      </GlassPanel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Gem buttons">
          <div className="flex flex-wrap items-center gap-4">
            <GemButton size="lg" icon={<Play fill="currentColor" strokeWidth={0} />}>
              PLAY
            </GemButton>
            <GemButton variant="rose">MAP</GemButton>
            <GemButton variant="gold" icon={<Gift size={18} />}>
              OPEN
            </GemButton>
            <GemButton variant="sky" size="sm">
              Small
            </GemButton>
            <GemButton variant="glass">Glass</GemButton>
            <GemButton disabled>Disabled</GemButton>
          </div>
        </Section>
        <Section title="Icon buttons & keys">
          <div className="flex items-center gap-4">
            <IconButton label="Achievements" icon={<Trophy />} badge={3} />
            <IconButton label="Search" icon={<Search />} />
            <IconButton label="Settings" icon={<Settings />} />
            <span className="flex gap-1.5">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </div>
        </Section>
        <Section title="Counters">
          <div className="flex flex-wrap gap-3">
            <StatChip icon={<Star />} tone="gold" value={246} suffix=" / 1,743" label="Stars earned" />
            <StatChip icon={<Flame />} tone="fire" value={12} label="Day streak" />
            <StatChip icon={<Snowflake />} tone="ice" value={2} label="Freezes" />
          </div>
        </Section>
        <Section title="Progress">
          <div className="space-y-4">
            <ProgressBar value={0.135} tone="xp" height={14} segments label="XP to next rank" />
            <ProgressBar value={0.42} label="Stars in world" />
            <ProgressBar value={0.8} tone="mint" label="Levels cleared" />
            <div className="flex gap-4">
              <ProgressRing value={0.67} color="#16d27f" label="Clear 3 levels">
                <Target />
              </ProgressRing>
              <ProgressRing value={0.4} color="#22b6f2" label="Review 5 levels">
                <Repeat />
              </ProgressRing>
              <ProgressRing value={1} color="#f59e0b" label="Simulation goal">
                <Zap />
              </ProgressRing>
            </div>
          </div>
        </Section>
        <Section title="Level medallions">
          <div className="flex flex-wrap items-center gap-5">
            <LevelMedallion state="cleared" number={1} size={56} />
            <LevelMedallion state="available" number={2} size={56} />
            <LevelMedallion state="current" number={3} size={64} />
            <LevelMedallion state="locked" number={4} size={56} />
            <LevelMedallion state="available" number={null} size={56} />
            <LevelMedallion state="locked" number={null} size={56} />
          </div>
        </Section>
        <Section title="Stars & tags">
          <div className="flex flex-wrap items-center gap-5">
            <StarRating stars={0} />
            <StarRating stars={1} />
            <StarRating stars={2} />
            <StarRating stars={3} size={26} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Tag>Tier 3</Tag>
            <Tag tone="gold">
              <Gift />
              Bonus
            </Tag>
            <Tag tone="rose">Up next</Tag>
            <Tag tone="mint">Cleared</Tag>
            <Tag tone="lock">
              <Lock />
              Locked
            </Tag>
          </div>
        </Section>
        <Section title="Dark glass & modal">
          <div className="flex items-center gap-4">
            <GlassPanel tone="dark" className="rounded-2xl px-4 py-3 text-sm font-semibold">
              Dark glass for contrast over bright scenes
            </GlassPanel>
            <GemButton variant="sky" size="sm" onClick={() => setOpen(true)}>
              Open modal
            </GemButton>
          </div>
          <Modal
            open={open}
            onOpenChange={setOpen}
            title="Level clear preview"
            description="Modal surface used for celebrations and dialogs."
          >
            <div className="mt-4 flex justify-center">
              <StarRating stars={2} size={48} />
            </div>
          </Modal>
        </Section>
        <Section title="Type & colour">
          <p className="font-display text-4xl font-extrabold">Outfit Display</p>
          <p className="mt-1 text-[15px] font-medium text-ink-2">
            Inter text — clear, compact, readable at small sizes.
          </p>
          <p className="mt-1 font-mono text-sm">JetBrains Mono · while (true) {'{ learn(); }'}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <span key={c} className="flex flex-col items-center gap-1 text-[10px] font-bold text-muted">
                <span className="swatch size-10" style={{ background: `var(--color-${c})` }} />
                {c}
              </span>
            ))}
          </div>
        </Section>
      </div>
      <Section title="SIMULATIONS">
        <SimulationFrame id="page-replacement" />
      </Section>
    </div>
  );
}
