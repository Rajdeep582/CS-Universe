import { create } from 'zustand';
import { z } from 'zod';

/** Learner preferences (03 §5, §6, §10, §12: every reward mechanic can be calmed or hidden). */
export const PrefsSchema = z.object({
  celebrations: z.enum(['full', 'calm']).catch('full'),
  showStreak: z.boolean().catch(true),
  streakMode: z.enum(['daily', 'weekly']).catch('daily'),
  weeklyTarget: z.int().min(1).max(7).catch(3),
  dailyGoals: z.boolean().catch(true),
  retention: z.number().min(0.8).max(0.95).catch(0.9),
  reviewCap: z.int().min(1).max(100).catch(15),
});
export type Prefs = z.infer<typeof PrefsSchema>;
export const DEFAULT_PREFS: Prefs = PrefsSchema.parse({});

const KEY = 'csu.prefs';
function load(): Prefs {
  try {
    return PrefsSchema.parse(JSON.parse(localStorage.getItem(KEY) ?? '{}'));
  } catch {
    return DEFAULT_PREFS;
  }
}

export const usePrefs = create<Prefs & { set(p: Partial<Prefs>): void }>((set, get) => ({
  ...(typeof localStorage === 'undefined' ? DEFAULT_PREFS : load()),
  set: (p) => {
    set(p);
    const { set: _omit, ...prefs } = get(); // eslint-disable-line @typescript-eslint/no-unused-vars
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* storage full or blocked: preferences then last for this tab */
    }
  },
}));
