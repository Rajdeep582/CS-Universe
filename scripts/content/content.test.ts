// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { loadContent } from './load';
import { compileContent } from '../../src/engine/content/validate';
import { loadLessons } from './lessons';

describe('real content/', () => {
  const loaded = loadContent(join(__dirname, '../../content'));
  const res = loaded.raw ? compileContent(loaded.raw) : null;
  it('loads and validates without errors or warnings', () => {
    expect(loaded.errors).toEqual([]);
    expect(res!.errors).toEqual([]);
    expect(res!.warnings).toEqual([]);
  });
  it('has valid lessons, and every World 1 level is playable', () => {
    const l = loadLessons(join(__dirname, '../../content'), loaded.raw!, res!.curriculum!);
    expect(l.errors).toEqual([]);
    const origins = res!.curriculum!.levels.filter((x) => x.worldId === 'origins');
    expect(origins.filter((x) => !l.lessons[x.id]).map((x) => x.id)).toEqual([]);
  });
  it('keeps the Phase 0 totals', () => {
    expect(res!.curriculum!.stats).toMatchObject({ worlds: 12, stages: 41, levels: 581, coreLevels: 337, edges: 806, crossStageEdges: 260 });
  });
  it('has a single starting level', () => {
    expect(res!.curriculum!.levels.filter((l) => l.requires.length === 0).map((l) => l.id)).toEqual(['what-is-computer']);
  });
  it('gives every stage a numbered road starting at 1', () => {
    for (const s of res!.curriculum!.stages) {
      const nums = res!.curriculum!.levels.filter((l) => l.stageId === s.id && l.number !== null).map((l) => l.number);
      expect(nums).toEqual(Array.from({ length: s.coreLevelCount }, (_, i) => i + 1));
    }
  });
});
