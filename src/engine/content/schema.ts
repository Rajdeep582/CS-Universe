import { z } from 'zod';

const id = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'ids are lowercase kebab-case (a-z, 0-9, single hyphens)');

/** content/worlds/NN-<id>/world.yaml */
export const WorldFileSchema = z.strictObject({
  id,
  order: z.number().int().positive(),
  title: z.string().min(1),
  tagline: z.string().min(1),
  biome: z.string().min(1),
  biomeKind: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'colour must be #RRGGBB'),
});

const LevelSourceSchema = z.strictObject({
  id,
  title: z.string().min(1),
  core: z.boolean(),
  requires: z.array(id),
});

const UnitSourceSchema = z.strictObject({
  id,
  title: z.string().min(1),
  levels: z.array(LevelSourceSchema).min(1),
});

/** content/worlds/NN-<world>/NN-<id>/stage.yaml */
export const StageFileSchema = z.strictObject({
  id,
  order: z.number().int().positive(),
  title: z.string().min(1),
  tier: z.number().int().min(0).max(9),
  refs: z.array(z.string().min(1)).min(1),
  boss: z.strictObject({ title: z.string().min(1), description: z.string().min(1) }),
  units: z.array(UnitSourceSchema).min(1),
});

/** content/core-path.yaml */
export const CorePathFileSchema = z.strictObject({ stages: z.array(id).min(1) });

export type WorldFile = z.infer<typeof WorldFileSchema>;
export type StageFile = z.infer<typeof StageFileSchema>;
export type CorePathFile = z.infer<typeof CorePathFileSchema>;

/** Raw content as read from disk, before graph checks. */
export interface RawContent {
  corePath: CorePathFile;
  worlds: { folder: string; file: WorldFile; stages: { folder: string; file: StageFile }[] }[];
}

// ───────────── compiled, runtime shape (src/generated/curriculum.json) ─────────────

export interface World {
  id: string;
  order: number;
  title: string;
  tagline: string;
  biome: string;
  biomeKind: string;
  color: string;
  stageIds: string[];
  levelCount: number;
}

export interface Unit {
  id: string;
  title: string;
  levelIds: string[];
}

export interface Stage {
  id: string;
  worldId: string;
  order: number;
  title: string;
  tier: number;
  refs: string[];
  boss: { title: string; description: string };
  units: Unit[];
  corePathIndex: number;
  levelCount: number;
  coreLevelCount: number;
}

export interface Level {
  id: string;
  title: string;
  core: boolean;
  requires: string[];
  /** Levels that list this one in `requires`. */
  unlocks: string[];
  worldId: string;
  stageId: string;
  unitId: string;
  /** 1-based number on the stage road for core levels; null for bonus levels. */
  number: number | null;
  /** For bonus levels: the road level its side trail hangs off. */
  hostLevelId: string | null;
  /** Position in the global Core Path walk (core levels only). */
  corePathPosition: number | null;
}

export interface Curriculum {
  version: 1;
  worlds: World[];
  stages: Stage[];
  levels: Level[];
  corePath: string[];
  stats: { worlds: number; stages: number; levels: number; coreLevels: number; edges: number; crossStageEdges: number; maxStars: number };
}
