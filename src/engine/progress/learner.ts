import { create } from 'zustand';
import lessonsJson from '@/generated/lessons.json';
import type { LessonMeta } from '../lesson/schema';
import { SAVE_VERSION, SaveFileSchema, stamp, type EventInput, type LearnerEvent, type SaveFile } from './events';
import {
  EMPTY_STATE,
  reduce,
  replay,
  type JournalEntry,
  type LearnerState,
  type ReplayContext,
  type Stars,
} from './replay';
import { memoryStore, type EventStore } from './storage';
import { DEFAULT_PREFS, usePrefs, type Prefs } from './settings';

export type { Stars } from './replay';

const lessons = lessonsJson as unknown as Record<string, LessonMeta>;
const stepsOf = (levelId: string) => lessons[levelId]?.steps.map((s) => s.id) ?? [];
const contextFor = (p: Pick<Prefs, 'retention' | 'dailyGoals'>): ReplayContext => ({
  retention: p.retention,
  dailyGoals: p.dailyGoals,
  stepsOf,
});

/** Something the learner just earned, for the celebration layer. */
export interface Reward {
  id: number;
  event: LearnerEvent;
  xp: number;
  entries: JournalEntry[];
}

interface Store extends LearnerState {
  events: readonly LearnerEvent[];
  ready: boolean;
  persistent: boolean;
  saveError: boolean;
  /** Rewards not yet shown by the celebration layer. */
  rewards: readonly Reward[];
  init(store: EventStore): Promise<void>;
  /** Appends one event, updates every derived number, and queues rewards. Returns the XP it earned. */
  record(e: EventInput): number;
  /** Replays the log after a preference that affects derivation changed (retention, daily goals). */
  rebuild(): void;
  consumeReward(id: number): void;
  exportSave(): SaveFile;
  importSave(raw: unknown): Promise<{ ok: true; count: number } | { ok: false; error: string }>;
  reset(): Promise<void>;
}

let backend: EventStore = memoryStore();
let rewardId = 0;
const ctxNow = () => contextFor(typeof window === 'undefined' ? DEFAULT_PREFS : usePrefs.getState());

export const useLearner = create<Store>((set, get) => ({
  ...EMPTY_STATE,
  events: [],
  ready: false,
  persistent: false,
  saveError: false,
  rewards: [],
  async init(store) {
    backend = store;
    let events: LearnerEvent[] = [];
    try {
      events = await store.load();
    } catch {
      set({ saveError: true });
    }
    set({ ...replay(events, ctxNow()), events, ready: true, persistent: store.persistent });
  },
  record(input) {
    const e = stamp(input);
    const before = get();
    const { state, added } = reduce(before, e, ctxNow());
    const xp = state.xp - before.xp;
    const rewards =
      xp || added.length ? [...before.rewards, { id: ++rewardId, event: e, xp, entries: added }] : before.rewards;
    set({ ...state, events: [...before.events, e], rewards });
    backend.append(e).catch(() => set({ saveError: true }));
    return xp;
  },
  rebuild() {
    set({ ...replay(get().events, ctxNow()) });
  },
  consumeReward(id) {
    set({ rewards: get().rewards.filter((r) => r.id !== id) });
  },
  exportSave() {
    return {
      app: 'cs-universe',
      version: SAVE_VERSION,
      exportedAt: new Date().toISOString(),
      events: [...get().events],
    };
  },
  async importSave(raw) {
    const r = SaveFileSchema.safeParse(raw);
    if (!r.success) return { ok: false, error: 'This file is not a CS Universe progress file.' };
    const events = [...r.data.events].sort((a, b) => a.at - b.at);
    await backend.replace(events);
    set({ ...replay(events, ctxNow()), events, rewards: [] });
    return { ok: true, count: events.length };
  },
  async reset() {
    await backend.replace([]);
    set({ ...EMPTY_STATE, events: [], rewards: [] });
  },
}));

// Retention and daily goals change how the log is interpreted, so replay when they change.
if (typeof window !== 'undefined')
  usePrefs.subscribe((p, prev) => {
    if (p.retention !== prev.retention || p.dailyGoals !== prev.dailyGoals) useLearner.getState().rebuild();
  });

export const clearedSet = (stars: ReadonlyMap<string, Stars>): Set<string> => {
  const s = new Set<string>();
  for (const [id, n] of stars) if (n >= 1) s.add(id);
  return s;
};

export const starTotal = (stars: ReadonlyMap<string, Stars>): number => {
  let t = 0;
  for (const n of stars.values()) t += n;
  return t;
};
