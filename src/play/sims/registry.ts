import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { SimulationId } from '@/engine/sim/registry';

export interface SimProps {
  /** Called when the learner reaches the simulation's goal (idempotent at the store level). */
  onGoal?: () => void;
  /** Extra attributes from the lesson's <Simulation …/> tag (e.g. bits, target). */
  params?: Record<string, unknown>;
}

export const SIM_TITLES: Record<SimulationId, string> = {
  'tiny-machine': 'Tiny Machine — a stored-program computer',
  'page-replacement': 'Page replacement — FIFO, LRU, OPT',
  'binary-board': 'Binary board — place values',
  'base-converter': 'Base converter — repeated division',
  'twos-complement': "Two's complement — one pattern, many readings",
  'float-explorer': 'IEEE 754 binary32 explorer',
  'logic-lab': 'Logic lab — expressions and truth tables',
  karnaugh: 'Karnaugh map',
  'utf8-encoder': 'Text encoder — code points, UTF-8, UTF-16',
  'byte-order': 'Byte order — big- and little-endian',
  parity: 'Parity check — send, flip, detect',
  'rgb-mixer': 'RGB colour mixer',
};

const v = <K extends string>(load: () => Promise<Record<K, ComponentType<SimProps>>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

export const SIM_VIEWS: Record<SimulationId, LazyExoticComponent<ComponentType<SimProps>>> = {
  'tiny-machine': v(() => import('./TinyMachineView'), 'TinyMachineView'),
  'page-replacement': v(() => import('./PageReplacementView'), 'PageReplacementView'),
  'binary-board': v(() => import('./BinaryBoardView'), 'BinaryBoardView'),
  'base-converter': v(() => import('./BaseConverterView'), 'BaseConverterView'),
  'twos-complement': v(() => import('./TwosComplementView'), 'TwosComplementView'),
  'float-explorer': v(() => import('./FloatView'), 'FloatView'),
  'logic-lab': v(() => import('./LogicLabView'), 'LogicLabView'),
  karnaugh: v(() => import('./KarnaughView'), 'KarnaughView'),
  'utf8-encoder': v(() => import('./Utf8View'), 'Utf8View'),
  'byte-order': v(() => import('./ByteOrderView'), 'ByteOrderView'),
  parity: v(() => import('./ParityView'), 'ParityView'),
  'rgb-mixer': v(() => import('./RgbView'), 'RgbView'),
};
