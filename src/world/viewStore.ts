import { create } from 'zustand';

export type View =
  | { kind: 'world' }
  | { kind: 'island'; worldId: string }
  | { kind: 'stage'; worldId: string; stageId: string; levelId: string | null };

interface ViewState {
  hovered: string | null;
  setHovered: (id: string | null) => void;
  /** Height sampler of the scene currently on screen (labels use it for anchors). */
  sampler: ((x: number, z: number) => number) | null;
  samplerKey: string | null;
  setSampler: (key: string, f: (x: number, z: number) => number) => void;
  perf: { fps: number; calls: number; triangles: number; dpr: number };
  setPerf: (p: ViewState['perf']) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  hovered: null,
  setHovered: (hovered) => set({ hovered }),
  sampler: null,
  samplerKey: null,
  setSampler: (samplerKey, sampler) => set({ samplerKey, sampler }),
  perf: { fps: 0, calls: 0, triangles: 0, dpr: 1 },
  setPerf: (perf) => set({ perf }),
}));
