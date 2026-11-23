import {
  SECTIONS,
  TESTED_SECTIONS,
  TestFileSchema,
  type Item,
  type LessonMeta,
  type Section,
  type StepMeta,
} from './schema';

const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];

/** Extracts <Step> metadata and <Simulation> ids from lesson MDX source. */
export function parseLesson(src: string): {
  steps: { id: string | undefined; section: string | undefined; title: string | undefined }[];
  simulations: string[];
  closes: number;
} {
  const steps = [...src.matchAll(/<Step\b[^>]*>/g)].map((m) => ({
    id: attr(m[0], 'id'),
    section: attr(m[0], 'section'),
    title: attr(m[0], 'title'),
  }));
  const simulations = [...src.matchAll(/<Simulation\b[^>]*>/g)].map((m) => attr(m[0], 'id') ?? '');
  const closes = (src.match(/<\/Step>/g) ?? []).length;
  return { steps, simulations, closes };
}

function checkItem(item: Item, where: string, errors: string[]) {
  const dup = (xs: string[]) => new Set(xs).size !== xs.length;
  switch (item.type) {
    case 'mcq':
    case 'predict-output':
      if (item.answer >= item.options.length) errors.push(`${where}: answer ${item.answer} is not an option index`);
      if (dup(item.options)) errors.push(`${where}: duplicate options`);
      break;
    case 'spot-the-bug':
      if (item.answer >= item.lines.length) errors.push(`${where}: answer ${item.answer} is not a line index`);
      break;
    case 'order-steps':
      if (dup(item.steps)) errors.push(`${where}: duplicate steps`);
      break;
    case 'match':
      if (dup(item.pairs.map((p) => p.left)) || dup(item.pairs.map((p) => p.right)))
        errors.push(`${where}: duplicate match entries`);
      break;
    case 'numeric':
      break;
  }
}

/**
 * Validates one level's lesson + test and returns its metadata.
 * Rules: every section present once or more, in order; unique step ids; every simulation registered;
 * test items schema-valid with valid answers; every item `teaches` a real step in a tested section;
 * every tested section covered by at least one item.
 */
export function compileLesson(
  levelId: string,
  path: string,
  mdx: string,
  testYaml: unknown,
  knownSimulations: ReadonlySet<string>,
): { lesson: LessonMeta | null; errors: string[] } {
  const errors: string[] = [];
  const where = path.replace(/\/lesson\.mdx$/, '');
  const parsed = parseLesson(mdx);
  if (parsed.closes !== parsed.steps.length)
    errors.push(`${where}/lesson.mdx: ${parsed.steps.length} <Step> tags but ${parsed.closes} </Step>`);
  const steps: StepMeta[] = [];
  let last = -1;
  parsed.steps.forEach((s, i) => {
    const at = `${where}/lesson.mdx step ${i + 1}`;
    if (!s.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)) return void errors.push(`${at}: missing or non-kebab-case id`);
    if (!s.title) errors.push(`${at} (${s.id}): missing title`);
    const idx = SECTIONS.indexOf(s.section as Section);
    if (idx === -1) return void errors.push(`${at} (${s.id}): unknown section "${s.section}"`);
    if (idx < last)
      errors.push(`${at} (${s.id}): section "${s.section}" is out of order (expected ${SECTIONS.join(' → ')})`);
    last = Math.max(last, idx);
    if (steps.some((x) => x.id === s.id)) errors.push(`${at}: duplicate step id "${s.id}"`);
    steps.push({ id: s.id, section: s.section as Section, title: s.title ?? '' });
  });
  for (const sec of SECTIONS)
    if (!steps.some((s) => s.section === sec)) errors.push(`${where}/lesson.mdx: no step for section "${sec}"`);
  for (const sim of parsed.simulations)
    if (!knownSimulations.has(sim)) errors.push(`${where}/lesson.mdx: unknown simulation "${sim}"`);

  const res = TestFileSchema.safeParse(testYaml);
  if (!res.success) {
    for (const issue of res.error.issues)
      errors.push(`${where}/test.yaml: ${issue.path.join('.') || '(root)'} — ${issue.message}`);
    return { lesson: null, errors };
  }
  const items = res.data.items;
  const ids = new Set<string>();
  const byStep = new Map(steps.map((s) => [s.id, s]));
  for (const item of items) {
    const at = `${where}/test.yaml item "${item.id}"`;
    if (ids.has(item.id)) errors.push(`${at}: duplicate id`);
    ids.add(item.id);
    const step = byStep.get(item.teaches);
    if (!step) errors.push(`${at}: teaches unknown step "${item.teaches}"`);
    else if (!TESTED_SECTIONS.includes(step.section))
      errors.push(`${at}: step "${item.teaches}" is in untested section "${step.section}"`);
    checkItem(item, at, errors);
  }
  for (const sec of TESTED_SECTIONS)
    if (!items.some((i) => byStep.get(i.teaches)?.section === sec))
      errors.push(`${where}/test.yaml: no item covers section "${sec}"`);
  if (items.length < 6) errors.push(`${where}/test.yaml: pool has ${items.length} items; at least 6 are needed`);
  return {
    lesson: errors.length ? null : { levelId, path, steps, simulations: [...new Set(parsed.simulations)], test: items },
    errors,
  };
}
