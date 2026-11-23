import { z } from 'zod';

/** Lesson sections, in the order a lesson must present them. */
export const SECTIONS = [
  'hook',
  'intuition',
  'formal',
  'mechanism',
  'worked-example',
  'tradeoffs',
  'pitfalls',
  'context',
  'references',
] as const;
export type Section = (typeof SECTIONS)[number];

/** Sections the level test must cover (hook, context and references are not examined). */
export const TESTED_SECTIONS: readonly Section[] = [
  'intuition',
  'formal',
  'mechanism',
  'worked-example',
  'tradeoffs',
  'pitfalls',
];

export const SECTION_LABEL: Record<Section, string> = {
  hook: 'Hook',
  intuition: 'Intuition',
  formal: 'Formal model',
  mechanism: 'Mechanism',
  'worked-example': 'Worked example',
  tradeoffs: 'Trade-offs',
  pitfalls: 'Pitfalls',
  context: 'In context',
  references: 'References',
};

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be kebab-case');
const text = z.string().trim().min(1);
const base = { id, teaches: id, prompt: text, explain: text };

export const ItemSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...base, type: z.literal('mcq'), options: z.array(text).min(2).max(6), answer: z.int().min(0) }),
  z.strictObject({ ...base, type: z.literal('numeric'), answer: z.number(), tolerance: z.number().min(0).default(0) }),
  z.strictObject({
    ...base,
    type: z.literal('predict-output'),
    language: text,
    code: text,
    options: z.array(text).min(2).max(6),
    answer: z.int().min(0),
  }),
  z.strictObject({ ...base, type: z.literal('order-steps'), steps: z.array(text).min(3).max(8) }),
  z.strictObject({
    ...base,
    type: z.literal('spot-the-bug'),
    language: text,
    lines: z.array(z.string()).min(2),
    answer: z.int().min(0),
  }),
  z.strictObject({
    ...base,
    type: z.literal('match'),
    pairs: z
      .array(z.strictObject({ left: text, right: text }))
      .min(3)
      .max(6),
  }),
]);
export type Item = z.infer<typeof ItemSchema>;
export type ItemType = Item['type'];

export const TestFileSchema = z.strictObject({ items: z.array(ItemSchema).min(1) });

export interface StepMeta {
  id: string;
  section: Section;
  title: string;
}

/** Compiled lesson metadata (src/generated/lessons.json), keyed by level id. */
export interface LessonMeta {
  levelId: string;
  /** Path of lesson.mdx relative to the repo root, matching the import.meta.glob key. */
  path: string;
  steps: StepMeta[];
  simulations: string[];
  test: Item[];
}
