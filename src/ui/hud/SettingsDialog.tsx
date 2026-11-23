import { Gauge } from 'lucide-react';
import { clsx } from 'clsx';
import { Modal } from '../components';
import { TIERS, useQuality, type QualityMode } from '@/world/quality';

const OPTIONS: { id: QualityMode; title: string; text: string }[] = [
  { id: 'auto', title: 'Auto', text: 'Starts Balanced and steps down if the frame rate drops.' },
  { id: 'high', title: TIERS.high.label, text: 'Sharpest image, soft shadows, glow, full scenery.' },
  { id: 'balanced', title: TIERS.balanced.label, text: 'Good look for laptops with integrated graphics.' },
  { id: 'lite', title: TIERS.lite.label, text: 'No shadows, lighter scenery — older or low-power devices.' },
];

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mode, tier, overlay, setMode, toggleOverlay } = useQuality();
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Settings" description="Graphics quality for the 3D world.">
      <fieldset className="mt-5">
        <legend className="flex items-center gap-2 font-display text-[12px] font-extrabold tracking-[.14em] text-muted">
          <Gauge size={16} aria-hidden /> GRAPHICS QUALITY — NOW {TIERS[tier].label.toUpperCase()}
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {OPTIONS.map((o) => (
            <label
              key={o.id}
              className={clsx(
                'cursor-pointer rounded-2xl border bg-white/60 p-3.5 transition-shadow',
                mode === o.id ? 'border-sky-2 shadow-[0_0_0_3px_rgb(34_182_242/.35)]' : 'border-white',
              )}
            >
              <input
                type="radio"
                name="quality"
                value={o.id}
                checked={mode === o.id}
                onChange={() => setMode(o.id)}
                className="sr-only"
              />
              <span className="block font-display text-[16px] font-extrabold">{o.title}</span>
              <span className="mt-0.5 block text-[12.5px] font-medium text-ink-2">{o.text}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-5 flex cursor-pointer items-center gap-3 text-[14px] font-semibold">
        <input type="checkbox" checked={overlay} onChange={toggleOverlay} className="size-4 accent-sky-2" />
        Show performance overlay (F3)
      </label>
    </Modal>
  );
}
