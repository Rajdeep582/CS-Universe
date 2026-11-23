import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { z } from 'zod';
import { CorePathFileSchema, StageFileSchema, WorldFileSchema, type RawContent } from '../../src/engine/content/schema';

export interface LoadResult {
  raw: RawContent | null;
  errors: string[];
}

function read<T>(root: string, rel: string, schema: z.ZodType<T>, errors: string[]): T | null {
  const path = join(root, rel);
  if (!existsSync(path)) {
    errors.push(`${rel}: file is missing`);
    return null;
  }
  let data: unknown;
  try {
    data = parse(readFileSync(path, 'utf8'));
  } catch (e) {
    errors.push(`${rel}: invalid YAML — ${(e as Error).message.split('\n')[0]}`);
    return null;
  }
  const res = schema.safeParse(data);
  if (!res.success) {
    for (const issue of res.error.issues) errors.push(`${rel}: ${issue.path.join('.') || '(root)'} — ${issue.message}`);
    return null;
  }
  return res.data;
}

const dirs = (p: string) =>
  readdirSync(p)
    .filter((n) => statSync(join(p, n)).isDirectory())
    .sort();

/** Reads content/ from disk and schema-checks every file. */
export function loadContent(root: string): LoadResult {
  const errors: string[] = [];
  const corePath = read(root, 'core-path.yaml', CorePathFileSchema, errors);
  const worlds: RawContent['worlds'] = [];
  const worldsDir = join(root, 'worlds');
  if (!existsSync(worldsDir)) return { raw: null, errors: [...errors, 'worlds/: folder is missing'] };
  for (const wf of dirs(worldsDir)) {
    const file = read(root, `worlds/${wf}/world.yaml`, WorldFileSchema, errors);
    const stages: RawContent['worlds'][number]['stages'] = [];
    for (const sf of dirs(join(worldsDir, wf))) {
      const st = read(root, `worlds/${wf}/${sf}/stage.yaml`, StageFileSchema, errors);
      if (st) stages.push({ folder: sf, file: st });
    }
    if (file) worlds.push({ folder: wf, file, stages });
  }
  if (errors.length || !corePath) return { raw: null, errors };
  return { raw: { corePath, worlds }, errors };
}
