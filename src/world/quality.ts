import { create } from 'zustand';

export type Tier = 'high' | 'balanced' | 'lite';
export type QualityMode = 'auto' | Tier;

export const TIERS: Record<
  Tier,
  { dpr: [number, number]; shadowMap: number; shadows: boolean; props: number; bloom: boolean; label: string }
> = {
  high: { dpr: [1, 2], shadowMap: 2048, shadows: true, props: 1, bloom: true, label: 'High' },
  balanced: { dpr: [1, 1.5], shadowMap: 1024, shadows: true, props: 0.7, bloom: false, label: 'Balanced' },
  lite: { dpr: [1, 1], shadowMap: 512, shadows: false, props: 0.4, bloom: false, label: 'Lite' },
};

const ORDER: Tier[] = ['high', 'balanced', 'lite'];
const KEY = 'csu.quality';

function load(): QualityMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'auto' || v === 'high' || v === 'balanced' || v === 'lite') return v;
  } catch {
    /* storage unavailable */
  }
  return 'auto';
}

interface QualityState {
  mode: QualityMode;
  /** Tier in effect (auto starts at Balanced and can only step down within a session). */
  tier: Tier;
  overlay: boolean;
  setMode: (m: QualityMode) => void;
  /** Called by the performance monitor when the frame rate stays low. */
  decline: () => void;
  toggleOverlay: () => void;
}

const initialMode = load();
export const useQuality = create<QualityState>((set, get) => ({
  mode: initialMode,
  tier: initialMode === 'auto' ? 'balanced' : initialMode,
  overlay: false,
  setMode: (mode) => {
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* ignore */
    }
    set({ mode, tier: mode === 'auto' ? 'balanced' : mode });
  },
  decline: () => {
    const { mode, tier } = get();
    if (mode !== 'auto') return;
    const next = ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(tier) + 1)]!;
    if (next !== tier) set({ tier: next });
  },
  toggleOverlay: () => set((s) => ({ overlay: !s.overlay })),
}));

/** True when the browser can create a WebGL2 context. */
export function hasWebGL2(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}
