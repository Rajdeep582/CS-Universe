import type { Curriculum, Level, RawContent, Stage, World } from './schema';

export interface CompileResult {
  curriculum: Curriculum | null;
  errors: string[];
  warnings: string[];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Validates raw content and compiles it into the runtime curriculum. Pure: no I/O. */
export function compileContent(raw: RawContent): CompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string) => errors.push(m);

  // ── folders, orders, unique ids ──
  const worldIds = new Set<string>();
  const stageWhere = new Map<string, string>();
  const levelWhere = new Map<string, string>();
  const sortedWorlds = [...raw.worlds].sort((a, b) => a.file.order - b.file.order);
  sortedWorlds.forEach((w, i) => {
    const where = `worlds/${w.folder}/world.yaml`;
    if (w.folder !== `${pad(w.file.order)}-${w.file.id}`)
      err(`${where}: folder must be named "${pad(w.file.order)}-${w.file.id}" (order + id)`);
    if (w.file.order !== i + 1) err(`${where}: world orders must be 1..${raw.worlds.length} without gaps (found ${w.file.order})`);
    if (worldIds.has(w.file.id)) err(`${where}: duplicate world id "${w.file.id}"`);
    worldIds.add(w.file.id);
    const stages = [...w.stages].sort((a, b) => a.file.order - b.file.order);
    stages.forEach((s, j) => {
      const sw = `worlds/${w.folder}/${s.folder}/stage.yaml`;
      if (s.folder !== `${pad(s.file.order)}-${s.file.id}`)
        err(`${sw}: folder must be named "${pad(s.file.order)}-${s.file.id}" (order + id)`);
      if (s.file.order !== j + 1) err(`${sw}: stage orders in world "${w.file.id}" must be 1..${w.stages.length} without gaps`);
      if (stageWhere.has(s.file.id)) err(`${sw}: duplicate stage id "${s.file.id}" (also in ${stageWhere.get(s.file.id)})`);
      stageWhere.set(s.file.id, sw);
      const unitIds = new Set<string>();
      for (const u of s.file.units) {
        if (unitIds.has(u.id)) err(`${sw}: duplicate unit id "${u.id}"`);
        unitIds.add(u.id);
        for (const l of u.levels) {
          if (levelWhere.has(l.id)) err(`${sw}: duplicate level id "${l.id}" (also in ${levelWhere.get(l.id)})`);
          levelWhere.set(l.id, sw);
        }
      }
    });
  });

  // ── core path ──
  const cp = raw.corePath.stages;
  const cpIndex = new Map<string, number>();
  cp.forEach((s, i) => {
    if (!stageWhere.has(s)) err(`core-path.yaml: unknown stage "${s}"`);
    if (cpIndex.has(s)) err(`core-path.yaml: stage "${s}" listed twice`);
    cpIndex.set(s, i);
  });
  for (const s of stageWhere.keys()) if (!cpIndex.has(s)) err(`core-path.yaml: stage "${s}" is missing`);
  for (const w of sortedWorlds) {
    const st = [...w.stages].sort((a, b) => a.file.order - b.file.order).map((s) => s.file.id);
    const byCp = [...st].sort((a, b) => (cpIndex.get(a) ?? 0) - (cpIndex.get(b) ?? 0));
    if (st.join() !== byCp.join())
      err(`worlds/${w.folder}: stage folder order (${st.join(', ')}) must follow core-path order (${byCp.join(', ')})`);
  }
  if (errors.length) return { curriculum: null, errors, warnings };

  // ── build flat level table ──
  type L = { id: string; title: string; core: boolean; requires: string[]; worldId: string; stageId: string; unitId: string; idx: number; where: string };
  const lv = new Map<string, L>();
  const stageLevels = new Map<string, L[]>();
  for (const w of sortedWorlds)
    for (const s of w.stages) {
      const list: L[] = [];
      let idx = 0;
      for (const u of s.file.units)
        for (const l of u.levels) {
          const rec = { ...l, worldId: w.file.id, stageId: s.file.id, unitId: u.id, idx: idx++, where: stageWhere.get(s.file.id)! };
          lv.set(l.id, rec);
          list.push(rec);
        }
      stageLevels.set(s.file.id, list);
    }

  // ── references ──
  for (const l of lv.values()) {
    const seen = new Set<string>();
    for (const r of l.requires) {
      if (r === l.id) err(`${l.where}: level "${l.id}" requires itself`);
      if (seen.has(r)) err(`${l.where}: level "${l.id}" lists "${r}" twice`);
      seen.add(r);
      const t = lv.get(r);
      if (!t) {
        err(`${l.where}: level "${l.id}" requires unknown level "${r}"`);
        continue;
      }
      if (t.stageId === l.stageId && t.idx > l.idx)
        err(`${l.where}: level "${l.id}" requires "${r}", which appears later in the same stage — order levels so prerequisites come first`);
    }
  }
  if (errors.length) return { curriculum: null, errors, warnings };

  // ── cycles (Kahn) ──
  const indeg = new Map<string, number>();
  const out = new Map<string, string[]>();
  for (const l of lv.values()) {
    indeg.set(l.id, l.requires.length);
    for (const r of l.requires) out.set(r, [...(out.get(r) ?? []), l.id]);
  }
  const queue = [...lv.values()].filter((l) => l.requires.length === 0).map((l) => l.id);
  const topo: string[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    topo.push(n);
    for (const m of out.get(n) ?? []) {
      indeg.set(m, indeg.get(m)! - 1);
      if (indeg.get(m) === 0) queue.push(m);
    }
  }
  if (topo.length !== lv.size)
    err(`prerequisite cycle among levels: ${[...indeg].filter(([, v]) => v > 0).map(([k]) => k).join(', ')}`);

  // ── stage-level cycles ──
  const sdeps = new Map<string, Set<string>>();
  for (const l of lv.values())
    for (const r of l.requires) {
      const rs = lv.get(r)!.stageId;
      if (rs !== l.stageId) sdeps.set(l.stageId, new Set([...(sdeps.get(l.stageId) ?? []), rs]));
    }
  {
    const state = new Map<string, number>();
    const visit = (s: string, path: string[]): void => {
      if (state.get(s) === 2) return;
      if (state.get(s) === 1) {
        err(`stage dependency cycle: ${[...path.slice(path.indexOf(s)), s].join(' → ')}`);
        return;
      }
      state.set(s, 1);
      for (const d of sdeps.get(s) ?? []) visit(d, [...path, s]);
      state.set(s, 2);
    };
    for (const s of stageWhere.keys()) visit(s, []);
  }

  // ── core path closure ──
  for (const l of lv.values()) {
    if (!l.core) continue;
    for (const r of l.requires) {
      const t = lv.get(r)!;
      if (!t.core) err(`${l.where}: core level "${l.id}" requires bonus level "${r}" — a beginner on the Core Path would be blocked`);
      else if (cpIndex.get(t.stageId)! > cpIndex.get(l.stageId)!)
        err(`${l.where}: core level "${l.id}" requires "${r}" from stage "${t.stageId}", which comes later on the Core Path`);
    }
  }
  if (errors.length) return { curriculum: null, errors, warnings };

  // ── redundant (transitively implied) prerequisites → warnings ──
  const anc = new Map<string, Set<string>>();
  for (const id of topo) {
    const a = new Set<string>();
    for (const r of lv.get(id)!.requires) {
      a.add(r);
      for (const x of anc.get(r)!) a.add(x);
    }
    anc.set(id, a);
  }
  for (const l of lv.values())
    for (const r of l.requires)
      if (l.requires.some((o) => o !== r && anc.get(o)!.has(r)))
        warnings.push(`${l.where}: "${l.id}" → "${r}" is already implied by another prerequisite`);

  // ── compile ──
  const unlocks = new Map<string, string[]>();
  for (const l of lv.values()) for (const r of l.requires) unlocks.set(r, [...(unlocks.get(r) ?? []), l.id]);

  const levels: Level[] = [];
  const numberOf = new Map<string, number>();
  for (const list of stageLevels.values()) {
    let n = 0;
    for (const l of list) if (l.core) numberOf.set(l.id, ++n);
  }
  const hostOf = (l: L): string => {
    const same = l.requires.map((r) => lv.get(r)!).filter((t) => t.stageId === l.stageId).sort((a, b) => b.idx - a.idx)[0];
    if (!same) return stageLevels.get(l.stageId)!.find((x) => x.core)?.id ?? l.id;
    return same.core ? same.id : hostOf(same);
  };
  let cpPos = 0;
  const cpPosOf = new Map<string, number>();
  for (const s of cp) for (const l of stageLevels.get(s)!) if (l.core) cpPosOf.set(l.id, ++cpPos);

  for (const l of lv.values())
    levels.push({
      id: l.id,
      title: l.title,
      core: l.core,
      requires: l.requires,
      unlocks: unlocks.get(l.id) ?? [],
      worldId: l.worldId,
      stageId: l.stageId,
      unitId: l.unitId,
      number: numberOf.get(l.id) ?? null,
      hostLevelId: l.core ? null : hostOf(l),
      corePathPosition: cpPosOf.get(l.id) ?? null,
    });

  const stages: Stage[] = [];
  const worlds: World[] = sortedWorlds.map((w) => {
    const st = [...w.stages].sort((a, b) => a.file.order - b.file.order);
    for (const s of st) {
      const list = stageLevels.get(s.file.id)!;
      stages.push({
        id: s.file.id,
        worldId: w.file.id,
        order: s.file.order,
        title: s.file.title,
        tier: s.file.tier,
        refs: s.file.refs,
        boss: s.file.boss,
        units: s.file.units.map((u) => ({ id: u.id, title: u.title, levelIds: u.levels.map((x) => x.id) })),
        corePathIndex: cpIndex.get(s.file.id)!,
        levelCount: list.length,
        coreLevelCount: list.filter((x) => x.core).length,
      });
    }
    return {
      id: w.file.id,
      order: w.file.order,
      title: w.file.title,
      tagline: w.file.tagline,
      biome: w.file.biome,
      biomeKind: w.file.biomeKind,
      color: w.file.color,
      stageIds: st.map((s) => s.file.id),
      levelCount: st.reduce((n, s) => n + stageLevels.get(s.file.id)!.length, 0),
    };
  });

  const edges = levels.reduce((n, l) => n + l.requires.length, 0);
  const crossStageEdges = levels.reduce((n, l) => n + l.requires.filter((r) => lv.get(r)!.stageId !== l.stageId).length, 0);
  return {
    curriculum: {
      version: 1,
      worlds,
      stages,
      levels,
      corePath: cp,
      stats: {
        worlds: worlds.length,
        stages: stages.length,
        levels: levels.length,
        coreLevels: levels.filter((l) => l.core).length,
        edges,
        crossStageEdges,
        maxStars: levels.length * 3,
      },
    },
    errors,
    warnings,
  };
}
