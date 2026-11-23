import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from './content/load';
import { compileContent } from '../src/engine/content/validate';
import { curriculumMarkdown } from './content/doc';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

const loaded = loadContent(join(root, 'content'));
if (!loaded.raw) {
  for (const e of loaded.errors) console.error(red(`✗ ${e}`));
  console.error(red(`\nContent check failed: ${loaded.errors.length} error(s).`));
  process.exit(1);
}
const { curriculum, errors, warnings } = compileContent(loaded.raw);
for (const w of warnings) console.warn(yellow(`! ${w}`));
if (!curriculum || errors.length) {
  for (const e of errors) console.error(red(`✗ ${e}`));
  console.error(red(`\nContent check failed: ${errors.length} error(s).`));
  process.exit(1);
}
const out = join(root, 'src/generated/curriculum.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(curriculum));
const s = curriculum.stats;
console.log(
  `✓ content ok — ${s.worlds} worlds · ${s.stages} stages · ${s.levels} levels (${s.coreLevels} core) · ${s.edges} prerequisites${warnings.length ? ` · ${warnings.length} warning(s)` : ''}`,
);
if (process.argv.includes('--doc')) {
  writeFileSync(join(root, 'docs/blueprint/02-curriculum.md'), curriculumMarkdown(curriculum));
  console.log('✓ docs/blueprint/02-curriculum.md regenerated');
}
