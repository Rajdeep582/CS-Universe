import { useMemo } from 'react';
import { curriculum, levelsOfStage, stageById, worldById } from '@/engine/content';
import { stageLayout, worldLayout } from '@/engine/world/layout';
import { useProgress } from '@/app/useProgress';
import { worldStatus } from '@/app/derive';

/** World layout with fog-of-war from progress (a world is open when any of its levels is available or cleared). */
export function useWorldLayout() {
  const { cleared } = useProgress();
  return useMemo(() => worldLayout(curriculum, (w) => !worldStatus(w, cleared).open), [cleared]);
}

export function useStageLayout(stageId: string | undefined) {
  return useMemo(() => {
    const s = stageId ? stageById.get(stageId) : undefined;
    if (!s) return null;
    return stageLayout(s, levelsOfStage(s.id), worldById.get(s.worldId)!.biomeKind);
  }, [stageId]);
}
