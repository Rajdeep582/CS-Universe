// Fails when a production dependency (anything shipped to learners) has a license outside the allow-list.
// Allow-list: master prompt (MIT, Apache-2.0, BSD, ISC, OFL, CC0, CC-BY) + owner-approved exceptions D1/D2 (2026-11-23).
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const ALLOWED = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'ISC',
  'OFL-1.1',
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-3.0',
]);
// Unlicense = public-domain dedication, same effect as CC0 (pulled in by @tanstack/react-router → isbot).
ALLOWED.add('Unlicense');
const EXCEPTIONS = {
  Zlib: () => true, // D1 — permissive, OSI-approved (postprocessing)
  'MPL-2.0': (name) => name === 'pyodide', // D2 — only Pyodide, shipped unmodified
};

// Some packages omit the "license" field but ship a LICENSE file; read its heading in that case.
function licenseFromFile(path) {
  const dir = new URL(`../${path}/`, import.meta.url);
  if (!existsSync(dir)) return undefined;
  const f = readdirSync(dir).find((n) => /^licen[cs]e/i.test(n));
  if (!f) return undefined;
  const head = readFileSync(new URL(f, dir), 'utf8').slice(0, 300);
  if (/^\s*MIT License/i.test(head) || /Permission is hereby granted, free of charge/.test(head)) return 'MIT';
  if (/Apache License/.test(head) && /Version 2\.0/.test(head)) return 'Apache-2.0';
  if (/ISC License/i.test(head)) return 'ISC';
  return undefined;
}

const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const bad = [];
let count = 0;
for (const [path, meta] of Object.entries(lock.packages)) {
  if (!path || meta.dev || meta.devOptional) continue;
  const name = path.split('node_modules/').pop();
  const license =
    meta.license ??
    JSON.parse(readFileSync(new URL(`../${path}/package.json`, import.meta.url), 'utf8')).license ??
    licenseFromFile(path);
  count++;
  const ids = String(license ?? 'UNKNOWN')
    .replace(/[()]/g, '')
    .split(/\s+OR\s+/);
  const ok = ids.some((id) => ALLOWED.has(id) || EXCEPTIONS[id]?.(name));
  if (!ok) bad.push(`${name}@${meta.version}: ${license ?? 'UNKNOWN'}`);
}
if (bad.length) {
  console.error(
    `✗ ${bad.length} production dependenc${bad.length === 1 ? 'y has' : 'ies have'} a disallowed license:\n  ${bad.join('\n  ')}`,
  );
  process.exit(1);
}
console.log(`✓ licenses ok — ${count} production packages checked`);
