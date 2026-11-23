import {
  levelById,
  levelsOfStage,
  levelsOfWorld,
  stageById,
  worldById,
  type Level,
  type Stage,
  type World,
} from '@/engine/content';
import { levelState, missingPrerequisites } from '@/engine/progress/availability';

export interface Status {
  open: boolean;
  available: number;
  cleared: number;
  total: number;
  /** For a locked group: worlds that hold the prerequisites blocking its first Core Path level. */
  needs: World[];
}

function status(levels: Level[], cleared: ReadonlySet<string>): Status {
  let a = 0;
  let c = 0;
  for (const l of levels) {
    const s = levelState(l, cleared);
    if (s === 'cleared') c++;
    else if (s === 'available') a++;
  }
  const open = a + c > 0;
  let needs: World[] = [];
  if (!open) {
    const first =
      [...levels]
        .filter((l) => l.corePathPosition !== null)
        .sort((x, y) => x.corePathPosition! - y.corePathPosition!)[0] ?? levels[0];
    if (first) {
      const ws = new Set(missingPrerequisites(first, cleared).map((r) => levelById.get(r)!.worldId));
      needs = [...ws].map((id) => worldById.get(id)!).sort((x, y) => x.order - y.order);
    }
  }
  return { open, available: a, cleared: c, total: levels.length, needs };
}

export const worldStatus = (w: World, cleared: ReadonlySet<string>) => status(levelsOfWorld(w.id), cleared);
export const stageStatus = (s: Stage, cleared: ReadonlySet<string>) => status(levelsOfStage(s.id), cleared);
export const stagesOf = (w: World) => w.stageIds.map((id) => stageById.get(id)!);
