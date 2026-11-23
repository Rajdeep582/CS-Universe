import { create } from 'zustand';

export interface CamShot {
  position: [number, number, number];
  target: [number, number, number];
  /** Changes to force a re-apply of the same shot. */
  nonce: number;
}

interface CamState {
  shot: CamShot | null;
  bounds: { x0: number; x1: number; z0: number; z1: number } | null;
  limits: { minDistance: number; maxDistance: number };
  setShot: (position: CamShot['position'], target: CamShot['target']) => void;
  setBounds: (b: CamState['bounds'], limits: CamState['limits']) => void;
}

let n = 0;
export const useCamera = create<CamState>((set) => ({
  shot: null,
  bounds: null,
  limits: { minDistance: 20, maxDistance: 420 },
  setShot: (position, target) => set({ shot: { position, target, nonce: ++n } }),
  setBounds: (bounds, limits) => set({ bounds, limits }),
}));
