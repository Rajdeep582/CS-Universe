import { useCallback, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Navigate, Outlet, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import * as THREE from 'three';
import { stageById, worldById } from '@/engine/content';
import { useProgress } from '@/app/useProgress';
import { useLearner } from '@/engine/progress/learner';
import { ContinueBar } from '@/ui/hud/ContinueBar';
import { CameraRig } from './CameraRig';
import { useCamera } from './cameraStore';
import { LabelLayer, LabelProjector } from './labels';
import { PerfProbe, DevOverlay } from './DevOverlay';
import { TIERS, hasWebGL2, useQuality } from './quality';
import { islandShot, stageShot, worldShot } from './shots';
import { StageScene } from './StageScene';
import { useStageLayout, useWorldLayout } from './useWorldData';
import { WorldMapScene } from './WorldMapScene';
import { worldStatus } from '@/app/derive';
import { levelById, levelsOfStage } from '@/engine/content';

const WEBGL = typeof document !== 'undefined' && hasWebGL2();

/** Persistent 3D canvas for `/`, `/world/$worldId`, `/world/$worldId/$stageId`; route components render DOM overlays on top. */
export function WorldLayout() {
  const params = useParams({ strict: false }) as { worldId?: string; stageId?: string };
  const search = useSearch({ strict: false }) as { level?: string };
  const navigate = useNavigate();
  const tier = useQuality((s) => s.tier);
  const decline = useQuality((s) => s.decline);
  const toggleOverlay = useQuality((s) => s.toggleOverlay);
  const { medal, starsOf, next, cleared, info } = useProgress();
  const wl = useWorldLayout();
  const stage = params.stageId ? stageById.get(params.stageId) : undefined;
  const world = params.worldId ? worldById.get(params.worldId) : undefined;
  const L = useStageLayout(stage?.id);
  const setShot = useCamera((s) => s.setShot);
  const setBounds = useCamera((s) => s.setBounds);
  const levelId = search.level ?? null;

  // Camera follows the route.
  useEffect(() => {
    if (stage && L) {
      const f =
        levelId === '__boss'
          ? L.castle
          : (L.pedestals.find((p) => p.levelId === levelId) ?? L.chests.find((c) => c.levelId === levelId) ?? null);
      const s = stageShot(L, f);
      setBounds(L.bounds, { minDistance: 18, maxDistance: 320 });
      setShot(s.position, s.target);
    } else if (world) {
      const s = islandShot(wl, world.id);
      setBounds(wl.bounds, { minDistance: 25, maxDistance: 420 });
      if (s) setShot(s.position, s.target);
    } else {
      const s = worldShot(wl);
      setBounds(wl.bounds, { minDistance: 40, maxDistance: 420 });
      setShot(s.position, s.target);
    }
  }, [stage, world, L, wl, levelId, setShot, setBounds]);

  // Esc goes up one level; F3 toggles the performance overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, [role="dialog"]')) return;
      if (e.key === 'F3') {
        e.preventDefault();
        toggleOverlay();
        return;
      }
      if (e.key !== 'Escape') return;
      if (stage && levelId)
        void navigate({
          to: '/world/$worldId/$stageId',
          params: { worldId: stage.worldId, stageId: stage.id },
          search: {},
        });
      else if (stage) void navigate({ to: '/world/$worldId', params: { worldId: stage.worldId } });
      else if (world) void navigate({ to: '/' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, world, levelId, navigate, toggleOverlay]);

  const onPickIsland = useCallback(
    (worldId: string) => void navigate({ to: '/world/$worldId', params: { worldId } }),
    [navigate],
  );
  const onPickStage = useCallback(
    (worldId: string, stageId: string) =>
      void navigate({ to: '/world/$worldId/$stageId', params: { worldId, stageId }, search: {} }),
    [navigate],
  );
  const onPickLevel = useCallback(
    (id: string) =>
      stage &&
      void navigate({
        to: '/world/$worldId/$stageId',
        params: { worldId: stage.worldId, stageId: stage.id },
        search: { level: id },
      }),
    [navigate, stage],
  );

  const medalOf = useCallback((id: string) => medal(levelById.get(id)!), [medal]);
  const bossOpen = useMemo(
    () =>
      stage
        ? levelsOfStage(stage.id)
            .filter((l) => l.core)
            .every((l) => cleared.has(l.id))
        : false,
    [stage, cleared],
  );
  const bossBeaten = useLearner((st) => (stage ? st.bosses.has(stage.id) : false));
  const homeWorldId = next?.worldId ?? null;
  // World lit by progress: each stage's lantern glows with the share of its levels cleared.
  const stageLight = useMemo(() => {
    const m = new Map<string, number>();
    for (const isl of wl.islands)
      for (const sp of isl.stageSpots) {
        const ls = levelsOfStage(sp.stageId);
        m.set(sp.stageId, ls.length ? ls.filter((l) => cleared.has(l.id)).length / ls.length : 0);
      }
    return m;
  }, [wl, cleared]);
  const haloOf = useCallback(
    (id: string): 'mastered' | 'due' | 'cleared' | null => {
      const i = info(levelById.get(id)!);
      return i.due ? 'due' : i.mastered ? 'mastered' : i.medal === 'cleared' ? 'cleared' : null;
    },
    [info],
  );
  const goldRouteUntil = useMemo(
    () => wl.islands.reduce((m, i, k) => (worldStatus(i.world, cleared).cleared > 0 ? k : m), 0),
    [wl, cleared],
  );

  if (!WEBGL) return <Navigate to="/atlas" search={{ notice: 'webgl' }} />;
  const q = TIERS[tier];
  return (
    <>
      <div className="fixed inset-0 z-0 bg-[#bfeaff]">
        <Canvas
          shadows={q.shadows ? 'percentage' : false}
          dpr={q.dpr}
          camera={{ fov: 34, near: 1, far: 1600, position: [0, 232, 178] }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
          }}
          aria-label="3D map of the Isles of Computing"
        >
          <PerformanceMonitor onDecline={decline} bounds={() => [45, 58]} flipflops={3} />
          <CameraRig />
          {stage && L ? (
            <StageScene
              key={stage.id}
              stageId={stage.id}
              layout={L}
              tier={tier}
              medal={medalOf}
              stars={starsOf}
              halo={haloOf}
              bossOpen={bossOpen}
              bossBeaten={bossBeaten}
              onPickLevel={onPickLevel}
            />
          ) : (
            <WorldMapScene
              layout={wl}
              tier={tier}
              homeWorldId={homeWorldId}
              focusWorldId={world?.id ?? null}
              goldRouteUntil={Math.max(0, goldRouteUntil)}
              stageLight={stageLight}
              onPickIsland={onPickIsland}
              onPickStage={onPickStage}
            />
          )}
          <LabelProjector />
          <PerfProbe />
          {q.bloom ? (
            <EffectComposer multisampling={0}>
              <Bloom intensity={0.35} luminanceThreshold={0.92} mipmapBlur />
            </EffectComposer>
          ) : null}
        </Canvas>
      </div>
      <div
        className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgb(4_30_70/.32)_100%)]"
        aria-hidden
      />
      <LabelLayer>
        <Outlet />
      </LabelLayer>
      <ContinueBar />
      <DevOverlay />
    </>
  );
}
