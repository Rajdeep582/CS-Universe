import { useRef, useState, type ReactNode } from 'react';
import { Download, Gauge, HardDrive, PartyPopper, Repeat, Trash2, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import { Modal } from '../components';
import { TIERS, useQuality, type QualityMode } from '@/world/quality';
import { usePrefs } from '@/engine/progress/settings';
import { useLearner } from '@/engine/progress/learner';

const OPTIONS: { id: QualityMode; title: string; text: string }[] = [
  { id: 'auto', title: 'Auto', text: 'Starts Balanced and steps down if the frame rate drops.' },
  { id: 'high', title: TIERS.high.label, text: 'Sharpest image, soft shadows, glow, full scenery.' },
  { id: 'balanced', title: TIERS.balanced.label, text: 'Good look for laptops with integrated graphics.' },
  { id: 'lite', title: TIERS.lite.label, text: 'No shadows, lighter scenery — older or low-power devices.' },
];

const legend = 'flex items-center gap-2 font-display text-[12px] font-extrabold tracking-[.14em] text-muted';
const card = (on: boolean) =>
  clsx(
    'cursor-pointer rounded-2xl border bg-white/60 p-3.5 transition-shadow has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sky-2',
    on ? 'border-sky-2 shadow-[0_0_0_3px_rgb(34_182_242/.35)]' : 'border-white',
  );

function Choice<T extends string | number>({
  name,
  value,
  current,
  onPick,
  title,
  text,
}: {
  name: string;
  value: T;
  current: T;
  onPick: (v: T) => void;
  title: string;
  text: string;
}) {
  return (
    <label className={card(current === value)}>
      <input
        type="radio"
        name={name}
        value={String(value)}
        checked={current === value}
        onChange={() => onPick(value)}
        className="sr-only"
      />
      <span className="block font-display text-[15px] font-extrabold">{title}</span>
      <span className="mt-0.5 block text-[12.5px] font-medium text-ink-2">{text}</span>
    </label>
  );
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[14px] font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-sky-2"
      />
      {children}
    </label>
  );
}

function ProgressData() {
  const persistent = useLearner((s) => s.persistent);
  const saveError = useLearner((s) => s.saveError);
  const count = useLearner((s) => s.events.length);
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const exportSave = () => {
    const blob = new Blob([JSON.stringify(useLearner.getState().exportSave(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cs-universe-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importSave = async (f: File) => {
    let raw: unknown;
    try {
      raw = JSON.parse(await f.text());
    } catch {
      setMsg('That file is not valid JSON.');
      return;
    }
    const r = await useLearner.getState().importSave(raw);
    setMsg(r.ok ? `Progress restored (${r.count} events).` : r.error);
  };
  const btn = 'gem gem-glass gem-sm';
  return (
    <fieldset className="mt-6">
      <legend className={legend}>
        <HardDrive size={16} aria-hidden /> YOUR PROGRESS
      </legend>
      <p className="mt-2 text-[13px] font-medium text-ink-2">
        {saveError
          ? 'Progress could not be saved on this device — export it to keep a copy.'
          : persistent
            ? `Saved on this device only (${count} events). No account, nothing leaves your browser.`
            : 'This browser does not allow saving: progress lasts until the tab closes. Export to keep a copy.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={exportSave}>
          <Download size={16} /> Export
        </button>
        <button type="button" className={btn} onClick={() => file.current?.click()}>
          <Upload size={16} /> Import
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          aria-label="Import progress file"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importSave(f);
            e.target.value = '';
          }}
        />
        {confirm ? (
          <>
            <button
              type="button"
              className="gem gem-rose gem-sm"
              onClick={() => {
                void useLearner.getState().reset();
                setConfirm(false);
                setMsg('Progress erased.');
              }}
            >
              <Trash2 size={16} /> Yes, erase all progress
            </button>
            <button type="button" className={btn} onClick={() => setConfirm(false)}>
              Keep it
            </button>
          </>
        ) : (
          <button type="button" className={btn} onClick={() => setConfirm(true)}>
            <Trash2 size={16} /> Reset…
          </button>
        )}
      </div>
      {confirm ? (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-rose-3">
          This permanently erases all XP, stars, reviews and achievements on this device. Export first if you may want
          them back.
        </p>
      ) : null}
      {msg ? (
        <p role="status" className="mt-2 text-[13px] font-semibold text-ink-2">
          {msg}
        </p>
      ) : null}
    </fieldset>
  );
}

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mode, tier, overlay, setMode, toggleOverlay } = useQuality();
  const p = usePrefs();
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      description="Graphics, rewards, reviews and your saved progress."
    >
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        <fieldset className="mt-5">
          <legend className={legend}>
            <Gauge size={16} aria-hidden /> GRAPHICS QUALITY — NOW {TIERS[tier].label.toUpperCase()}
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {OPTIONS.map((o) => (
              <Choice
                key={o.id}
                name="quality"
                value={o.id}
                current={mode}
                onPick={setMode}
                title={o.title}
                text={o.text}
              />
            ))}
          </div>
        </fieldset>
        <div className="mt-4">
          <Check checked={overlay} onChange={() => toggleOverlay()}>
            Show performance overlay (F3)
          </Check>
        </div>

        <fieldset className="mt-6">
          <legend className={legend}>
            <PartyPopper size={16} aria-hidden /> REWARDS
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Choice
              name="celebrations"
              value="full"
              current={p.celebrations}
              onPick={(v) => p.set({ celebrations: v })}
              title="Full celebrations"
              text="Confetti, stamping stars, rank-up show."
            />
            <Choice
              name="celebrations"
              value="calm"
              current={p.celebrations}
              onPick={(v) => p.set({ celebrations: v })}
              title="Calm"
              text="Same information, no motion or confetti."
            />
          </div>
          <div className="mt-3 space-y-2.5">
            <Check checked={p.showStreak} onChange={(v) => p.set({ showStreak: v })}>
              Show streak
            </Check>
            {p.showStreak ? (
              <div className="flex flex-wrap items-center gap-3 pl-7 text-[13.5px] font-semibold">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="smode"
                    checked={p.streakMode === 'daily'}
                    onChange={() => p.set({ streakMode: 'daily' })}
                    className="accent-sky-2"
                  />
                  Daily (with freezes)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="smode"
                    checked={p.streakMode === 'weekly'}
                    onChange={() => p.set({ streakMode: 'weekly' })}
                    className="accent-sky-2"
                  />
                  Weekly goal:
                </label>
                <select
                  aria-label="Days per week"
                  value={p.weeklyTarget}
                  disabled={p.streakMode !== 'weekly'}
                  onChange={(e) => p.set({ weeklyTarget: Number(e.target.value) })}
                  className="rounded-lg border border-line bg-white px-2 py-1"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      {n} day{n > 1 ? 's' : ''} a week
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <Check checked={p.dailyGoals} onChange={(v) => p.set({ dailyGoals: v })}>
              Today&apos;s goals (optional bonus XP)
            </Check>
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className={legend}>
            <Repeat size={16} aria-hidden /> SPACED REVIEW
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[13.5px] font-semibold">
            <label className="block">
              Target recall
              <select
                value={p.retention}
                onChange={(e) => p.set({ retention: Number(e.target.value) })}
                className="mt-1 block w-full rounded-xl border border-line bg-white px-3 py-2"
              >
                <option value={0.8}>80 % — fewer reviews</option>
                <option value={0.85}>85 %</option>
                <option value={0.9}>90 % — recommended</option>
                <option value={0.95}>95 % — more reviews</option>
              </select>
            </label>
            <label className="block">
              Reviews per day (max)
              <input
                type="number"
                min={1}
                max={100}
                value={p.reviewCap}
                onChange={(e) =>
                  p.set({ reviewCap: Math.max(1, Math.min(100, Math.trunc(Number(e.target.value)) || 15)) })
                }
                className="mt-1 block w-full rounded-xl border border-line bg-white px-3 py-2"
              />
            </label>
          </div>
        </fieldset>

        <ProgressData />
      </div>
    </Modal>
  );
}
