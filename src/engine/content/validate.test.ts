import { describe, expect, it } from 'vitest';
import type { RawContent, StageFile } from './schema';
import { compileContent } from './validate';

type Lv = [id: string, core: boolean, requires?: string[]];
const stage = (id: string, order: number, levels: Lv[]): { folder: string; file: StageFile } => ({
  folder: `${String(order).padStart(2, '0')}-${id}`,
  file: {
    id,
    order,
    title: id,
    tier: 0,
    refs: ['Ref'],
    boss: { title: 'B', description: 'D' },
    units: [{ id: 'u', title: 'U', levels: levels.map(([lid, core, requires = []]) => ({ id: lid, title: lid, core, requires })) }],
  },
});
const world = (id: string, order: number, stages: ReturnType<typeof stage>[]) => ({
  folder: `${String(order).padStart(2, '0')}-${id}`,
  file: { id, order, title: id, tagline: 't', biome: 'b', biomeKind: 'k', color: '#ABCDEF' },
  stages,
});
const base = (): RawContent => ({
  corePath: { stages: ['s1', 's2'] },
  worlds: [
    world('w1', 1, [
      stage('s1', 1, [
        ['a', true],
        ['b', true, ['a']],
        ['x', false, ['b']],
      ]),
    ]),
    world('w2', 2, [stage('s2', 1, [['c', true, ['b']]])]),
  ],
});
const errs = (r: RawContent) => compileContent(r).errors.join('\n');

describe('compileContent', () => {
  it('compiles a valid curriculum', () => {
    const { curriculum, errors } = compileContent(base());
    expect(errors).toEqual([]);
    expect(curriculum!.stats).toMatchObject({ worlds: 2, stages: 2, levels: 4, coreLevels: 3, edges: 3, crossStageEdges: 1, maxStars: 12 });
    const byId = new Map(curriculum!.levels.map((l) => [l.id, l]));
    expect(byId.get('b')).toMatchObject({ number: 2, unlocks: ['x', 'c'], corePathPosition: 2 });
    expect(byId.get('x')).toMatchObject({ number: null, hostLevelId: 'b', corePathPosition: null });
    expect(byId.get('c')!.corePathPosition).toBe(3);
  });
  it('rejects a folder name that does not match order + id', () => {
    const r = base();
    r.worlds[0]!.folder = '01-wrong';
    expect(errs(r)).toMatch(/folder must be named "01-w1"/);
  });
  it('rejects gaps in world order', () => {
    const r = base();
    r.worlds[1]!.file.order = 3;
    r.worlds[1]!.folder = '03-w2';
    expect(errs(r)).toMatch(/world orders must be 1\.\.2/);
  });
  it('rejects duplicate level ids across stages', () => {
    const r = base();
    r.worlds[1]!.stages[0]!.file.units[0]!.levels.push({ id: 'a', title: 'a', core: false, requires: [] });
    expect(errs(r)).toMatch(/duplicate level id "a"/);
  });
  it('rejects unknown prerequisites', () => {
    const r = base();
    r.worlds[0]!.stages[0]!.file.units[0]!.levels[1]!.requires = ['nope'];
    expect(errs(r)).toMatch(/requires unknown level "nope"/);
  });
  it('rejects a prerequisite placed later in the same stage', () => {
    const r = base();
    r.worlds[0]!.stages[0]!.file.units[0]!.levels[0]!.requires = ['b'];
    expect(errs(r)).toMatch(/appears later in the same stage/);
  });
  it('rejects cycles across stages', () => {
    const r = base();
    r.worlds[0]!.stages[0]!.file.units[0]!.levels[0]!.requires = ['c'];
    r.worlds[1]!.stages[0]!.file.units[0]!.levels[0]!.core = false;
    expect(errs(r)).toMatch(/cycle/);
  });
  it('rejects a core level that needs a bonus level', () => {
    const r = base();
    r.worlds[1]!.stages[0]!.file.units[0]!.levels[0]!.requires = ['x'];
    expect(errs(r)).toMatch(/requires bonus level "x"/);
  });
  it('rejects a core level that needs a later Core Path stage', () => {
    const r = base();
    r.corePath.stages = ['s2', 's1'];
    expect(errs(r)).toMatch(/comes later on the Core Path/);
  });
  it('rejects a stage missing from the Core Path', () => {
    const r = base();
    r.corePath.stages = ['s1'];
    expect(errs(r)).toMatch(/stage "s2" is missing/);
  });
  it('rejects stage folders out of Core Path order', () => {
    const r = base();
    r.worlds[0]!.stages.push(stage('s3', 2, [['d', false]]));
    r.corePath.stages = ['s3', 's1', 's2'];
    expect(errs(r)).toMatch(/must follow core-path order/);
  });
  it('warns about transitively implied prerequisites', () => {
    const r = base();
    r.worlds[1]!.stages[0]!.file.units[0]!.levels[0]!.requires = ['a', 'b'];
    const res = compileContent(r);
    expect(res.errors).toEqual([]);
    expect(res.warnings.join()).toMatch(/"c" → "a" is already implied/);
  });
});
