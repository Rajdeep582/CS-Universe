import { z } from 'zod';

/**
 * The learner's history: an append-only log. Every number the game shows (XP, stars, ranks,
 * reviews, streaks, achievements) is derived by replaying it, so it can be exported, restored and audited.
 */
const when = {
  /** Epoch milliseconds. */
  at: z.number().int().nonnegative(),
  /** Local calendar day when the event happened (YYYY-MM-DD). */
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Local hour 0–23. */
  hour: z.int().min(0).max(23),
};
const base = { ...when, level: z.string().min(1) };

export const EventSchema = z.discriminatedUnion('t', [
  z.strictObject({ ...base, t: z.literal('step'), step: z.string().min(1) }),
  z.strictObject({ ...base, t: z.literal('sim'), sim: z.string().min(1) }),
  z.strictObject({
    ...base,
    t: z.literal('test'),
    correct: z.int().min(0),
    total: z.int().min(1),
    ms: z.int().min(0),
    proveIt: z.boolean(),
  }),
  z.strictObject({
    ...base,
    t: z.literal('review'),
    correct: z.int().min(0),
    total: z.int().min(1),
    ms: z.int().min(0),
  }),
  /** Stage boss exam. */
  z.strictObject({
    ...when,
    t: z.literal('boss'),
    stage: z.string().min(1),
    correct: z.int().min(0),
    total: z.int().min(1),
    ms: z.int().min(0),
  }),
]);
export type LearnerEvent = z.infer<typeof EventSchema>;
export type EventInput = DistributiveOmit<LearnerEvent, 'at' | 'day' | 'hour'>;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export const SAVE_VERSION = 1;
export const SaveFileSchema = z.strictObject({
  app: z.literal('cs-universe'),
  version: z.literal(SAVE_VERSION),
  exportedAt: z.string(),
  events: z.array(EventSchema),
});
export type SaveFile = z.infer<typeof SaveFileSchema>;

const pad = (n: number) => String(n).padStart(2, '0');
/** Local calendar day of a date. */
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Stamps an event with the current time, local day and hour. */
export function stamp(e: EventInput, now = new Date()): LearnerEvent {
  return { ...e, at: now.getTime(), day: dayKey(now), hour: now.getHours() } as LearnerEvent;
}

/** Whole days from day key a to day key b (calendar arithmetic in UTC, so DST never matters). */
export function daysBetween(a: string, b: string): number {
  const ms = (k: string) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
  return Math.round((ms(b) - ms(a)) / 86_400_000);
}
export function addDays(k: string, n: number): string {
  const d = new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10) + n));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
