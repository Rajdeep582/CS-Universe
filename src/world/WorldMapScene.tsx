import { useCallback, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { WorldLayout } from '@/engine/world/layout';
import { buildProps, kit, mats, type Instance } from '@/engine/world/props';
import { pieces } from '@/engine/world/pieces';
import { sampleHeight, type TerrainData, type TerrainSpec } from '@/engine/world/terrain';
import { TerrainWater } from './TerrainWater';
import { Atmosphere } from './Atmosphere';
import { Batch } from './Batch';
import { TIERS, type Tier } from './quality';
import { useViewStore } from './viewStore';

export const WORLD_FOG: [number, number] = [330, 720];

const boatMats = {
  hull: new THREE.MeshStandardMaterial({ roughness: 0.5 }),
  wood: new THREE.MeshStandardMaterial({ color: '#a06d3f', roughness: 0.9 }),
  sail: new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.6, side: THREE.DoubleSide }),
};
const buoyMat = new THREE.MeshStandardMaterial({ emissive: '#ffffff', emissiveIntensity: 0.5, roughness: 0.25 });
const flagMat = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide });
const pickMat = new THREE.MeshBasicMaterial({ visible: false });
const lavaMat = new THREE.MeshStandardMaterial({ color: '#ff5a1f', emissive: '#ff3d00', emissiveIntensity: 2.2 });
const smokeMat = new THREE.MeshStandardMaterial({ color: '#e9e6ef', transparent: true, opacity: 0.78, roughness: 1 });
const mistTex = (() => {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  if (!g) return null;
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, 'rgba(240,246,255,.9)');
  rg.addColorStop(0.5, 'rgba(235,242,252,.45)');
  rg.addColorStop(1, 'rgba(235,242,252,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
})();

interface Props {
  layout: WorldLayout;
  tier: Tier;
  /** World whose island the learner's next level is on (player boat moors there). */
  homeWorldId: string | null;
  focusWorldId: string | null;
  goldRouteUntil: number;
  onPickIsland: (worldId: string) => void;
  onPickStage: (worldId: string, stageId: string) => void;
}

/** The archipelago: one terrain + ocean, instanced props for all islands, sea route, boats, clouds, fog of war. */
export function WorldMapScene({
  layout,
  tier,
  homeWorldId,
  focusWorldId,
  goldRouteUntil,
  onPickIsland,
  onPickStage,
}: Props) {
  const q = TIERS[tier];
  const specs = useMemo(() => layout.islands.map((i) => i.spec), [layout]);
  const spec: TerrainSpec = useMemo(
    () => ({
      seed: 1337,
      bounds: layout.bounds,
      segX: tier === 'lite' ? 300 : 440,
      segZ: tier === 'lite' ? 200 : 290,
      islands: specs,
    }),
    [layout.bounds, specs, tier],
  );
  const [terrain, setTerrain] = useState<TerrainData | null>(null);
  const setSampler = useViewStore((s) => s.setSampler);
  const setHovered = useViewStore((s) => s.setHovered);
  const onReady = useCallback(
    (t: TerrainData) => {
      setTerrain(t);
      setSampler('world', (x, z) => sampleHeight(t, x, z));
    },
    [setSampler],
  );

  const props = useMemo(() => (terrain ? buildProps(terrain, specs, q.props, 1.1) : []), [terrain, specs, q.props]);

  const route = useMemo(() => {
    if (!terrain) return { buoys: [] as Instance[] };
    const curve = new THREE.CatmullRomCurve3(
      layout.route.map((p) => new THREE.Vector3(p.x, 0.3, p.z)),
      false,
      'centripetal',
      0.5,
    );
    const N = 420;
    const buoys: Instance[] = [];
    for (let k = 0; k <= N; k += 3) {
      const p = curve.getPoint(k / N);
      if (sampleHeight(terrain, p.x, p.z) > -0.4) continue;
      const done = (k / N) * (layout.route.length - 1) < goldRouteUntil;
      buoys.push({ x: p.x, y: 0.25, z: p.z, color: done ? '#ffc61a' : '#ffffff' });
    }
    return { buoys };
  }, [terrain, layout.route, goldRouteUntil]);

  const boats = useMemo(() => {
    const home = layout.islands.find((i) => i.world.id === homeWorldId);
    const list: (Instance & { hull: string })[] = [];
    if (home)
      list.push({ x: home.spec.x + home.spec.rx * 1.05, y: 0, z: home.spec.z + 10, ry: -0.5, s: 2.1, hull: '#ef4444' });
    const xs = layout.islands.map((i) => i.spec.x);
    const zs = layout.islands.map((i) => i.spec.z);
    const midZ = (Math.min(...zs) + Math.max(...zs)) / 2;
    list.push({ x: Math.min(...xs) - 46, y: 0, z: midZ + 36, ry: 0.8, s: 1.3, hull: '#3b82f6' });
    list.push({ x: Math.max(...xs) + 46, y: 0, z: midZ + 36, ry: 2.1, s: 1.3, hull: '#10b981' });
    list.push({ x: 0, y: 0, z: midZ - 36, ry: 0.3, s: 1.3, hull: '#8b5cf6' });
    return list;
  }, [layout, homeWorldId]);

  const flags = useMemo(() => {
    if (!terrain || !focusWorldId) return [];
    const isl = layout.islands.find((i) => i.world.id === focusWorldId);
    return isl ? isl.stageSpots.map((s) => ({ ...s, y: sampleHeight(terrain, s.x, s.z) })) : [];
  }, [terrain, focusWorldId, layout]);

  const volcanoes = useMemo(
    () =>
      terrain
        ? layout.islands
            .filter((i) => i.spec.kind === 'volcano' && i.spec.peak)
            .map((i) => ({
              id: i.world.id,
              locked: i.spec.locked,
              x: i.spec.peak!.x,
              z: i.spec.peak!.z,
              y: sampleHeight(terrain, i.spec.peak!.x, i.spec.peak!.z),
            }))
        : [],
    [terrain, layout],
  );

  const P = pieces();
  const K = kit();
  const over = (id: string) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(id);
    document.body.style.cursor = 'pointer';
  };
  const out = () => {
    setHovered(null);
    document.body.style.cursor = '';
  };

  return (
    <>
      <Atmosphere bounds={layout.bounds} tier={tier} fogNear={WORLD_FOG[0]} fogFar={WORLD_FOG[1]} />
      <TerrainWater spec={spec} fogNear={WORLD_FOG[0]} fogFar={WORLD_FOG[1]} onReady={onReady} />
      {props.map((b) => (
        <Batch
          key={b.key}
          geometry={b.geometry}
          material={b.material}
          items={b.items}
          castShadow={q.shadows && b.castShadow}
        />
      ))}
      <Batch geometry={P.buoy} material={buoyMat} items={route.buoys} castShadow={false} />
      <Batch
        geometry={P.boatHull}
        material={boatMats.hull}
        items={boats.map((b) => ({ ...b, color: b.hull }))}
        castShadow={q.shadows}
      />
      <Batch geometry={P.boatWood} material={boatMats.wood} items={boats} castShadow={q.shadows} />
      <Batch geometry={P.sail} material={boatMats.sail} items={boats} castShadow={q.shadows} />
      <Batch
        geometry={K.puff}
        material={mats().cloud!}
        items={[
          { x: layout.bounds.x0 + 60, y: 34, z: layout.bounds.z0 + 50, s: 2.3 },
          { x: layout.bounds.x1 - 50, y: 30, z: (layout.bounds.z0 + layout.bounds.z1) / 2 + 20, s: 2.1 },
          { x: 70, y: 46, z: layout.bounds.z0 + 25, s: 1.7 },
          { x: layout.bounds.x0 + 40, y: 30, z: layout.bounds.z1 - 70, s: 1.6 },
        ]}
        castShadow={q.shadows}
      />
      {volcanoes.map((v) => (
        <group key={v.id} position={[v.x, v.y, v.z]}>
          <mesh rotation-x={-Math.PI / 2} position-y={0.25} material={v.locked ? smokeMat : lavaMat}>
            <circleGeometry args={[1.7, 24]} />
          </mesh>
          {Array.from({ length: 6 }, (_, k) => (
            <mesh
              key={k}
              material={smokeMat}
              position={[k * 1.2 + Math.sin(k) * 0.8, 2 + k * 1.9, -k * 0.9]}
              castShadow={q.shadows}
            >
              <icosahedronGeometry args={[1.2 + k * 0.45, 2]} />
            </mesh>
          ))}
        </group>
      ))}
      {mistTex
        ? layout.islands
            .filter((i) => i.spec.locked)
            .map((i) => (
              <sprite key={i.world.id} position={[i.spec.x - 8, 6, i.spec.z + 2]} scale={[30, 13.5, 1]}>
                <spriteMaterial map={mistTex} transparent depthWrite={false} opacity={0.55} />
              </sprite>
            ))
        : null}
      {flags.length ? (
        <>
          <Batch
            geometry={P.post}
            material={mats().wood!}
            items={flags.map((f) => ({ x: f.x, y: f.y, z: f.z, s: 0.9, color: '#8a5a34' }))}
            castShadow={q.shadows}
          />
          <Batch
            geometry={P.board}
            material={flagMat}
            items={flags.map((f, k) => ({
              x: f.x + 1.2,
              y: f.y - 0.3,
              z: f.z,
              s: 0.8,
              sz: 0.4,
              color: ['#f43f8e', '#22b6f2', '#ffc61a', '#16d27f', '#8b5cf6', '#ff7a1a'][k % 6]!,
            }))}
            castShadow={q.shadows}
          />
          {flags.map((f) => (
            <mesh
              key={f.stageId}
              position={[f.x, f.y + 2, f.z]}
              material={pickMat}
              onClick={(e) => {
                e.stopPropagation();
                onPickStage(focusWorldId!, f.stageId);
              }}
              onPointerOver={over(`stage:${f.stageId}`)}
              onPointerOut={out}
            >
              <cylinderGeometry args={[3.2, 3.2, 6, 10]} />
            </mesh>
          ))}
        </>
      ) : null}
      {layout.islands.map((i) => (
        <mesh
          key={i.world.id}
          position={[i.spec.x, 1, i.spec.z]}
          scale={[i.spec.rx, 1, i.spec.rz]}
          material={pickMat}
          onClick={(e) => {
            e.stopPropagation();
            onPickIsland(i.world.id);
          }}
          onPointerOver={over(`world:${i.world.id}`)}
          onPointerOut={out}
        >
          <cylinderGeometry args={[1, 1, 6, 24]} />
        </mesh>
      ))}
    </>
  );
}
