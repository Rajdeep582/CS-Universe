import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { SimulationId } from '@/engine/sim/registry';

export interface SimProps {
  /** Called when the learner reaches the simulation's goal (idempotent at the store level). */
  onGoal?: () => void;
}

export const SIM_TITLES: Record<SimulationId, string> = {
  'tiny-machine': 'Tiny Machine — a stored-program computer',
  'page-replacement': 'Page replacement — FIFO, LRU, OPT',
};

export const SIM_VIEWS: Record<SimulationId, LazyExoticComponent<ComponentType<SimProps>>> = {
  'tiny-machine': lazy(() => import('./TinyMachineView').then((m) => ({ default: m.TinyMachineView }))),
  'page-replacement': lazy(() => import('./PageReplacementView').then((m) => ({ default: m.PageReplacementView }))),
};
