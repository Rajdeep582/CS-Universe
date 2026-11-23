import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { Curriculum, RawContent } from '../../src/engine/content/schema';
import type { LessonMeta } from '../../src/engine/lesson/schema';
import { compileLesson } from '../../src/engine/lesson/compile';
import { SIMULATION_IDS } from '../../src/engine/sim/registry';

/** Reads every content/worlds/<w>/<s>/levels/<level-id>/{lesson.mdx,test.yaml} and validates it. */
export function loadLessons(contentRoot: string, raw: RawContent, curriculum: Curriculum): { lessons: Record<string, LessonMeta>; errors: string[] } {
  const errors: string[] = [];
  const lessons: Record<string, LessonMeta> = {};
  const sims = new Set<string>(SIMULATION_IDS);
  const levelIds = new Map(curriculum.levels.map((l) => [l.id, l]));
  const worldsDir = join(contentRoot, 'worlds');
  for (const w of raw.worlds)
    for (const st of w.stages) {
      const stage = st.file;
      const rel = `worlds/${w.folder}/${st.folder}/levels`;
      const dir = join(worldsDir, w.folder, st.folder, 'levels');
      if (!existsSync(dir)) continue;
      for (const folder of readdirSync(dir).sort()) {
        if (!statSync(join(dir, folder)).isDirectory()) continue;
        const at = `${rel}/${folder}`;
        const level = levelIds.get(folder);
        if (!level || level.stageId !== stage.id) {
          errors.push(`${at}: folder name must be the id of a level in stage "${stage.id}"`);
          continue;
        }
        const mdxPath = join(dir, folder, 'lesson.mdx');
        const testPath = join(dir, folder, 'test.yaml');
        if (!existsSync(mdxPath) || !existsSync(testPath)) {
          errors.push(`${at}: needs both lesson.mdx and test.yaml`);
          continue;
        }
        let test: unknown;
        try {
          test = parse(readFileSync(testPath, 'utf8'));
        } catch (e) {
          errors.push(`${at}/test.yaml: invalid YAML — ${(e as Error).message.split('\n')[0]}`);
          continue;
        }
        const r = compileLesson(folder, `/content/${rel}/${folder}/lesson.mdx`, readFileSync(mdxPath, 'utf8'), test, sims);
        errors.push(...r.errors);
        if (r.lesson) lessons[folder] = r.lesson;
      }
    }
  return { lessons, errors };
}
