import { useCallback, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import type { StageLayout } from '@/engine/world/layout';
import { hashString } from '@/engine/world/noise';
import { buildProps, kit, mats, type Instance } from '@/engine/world/props';
import { buildRoad, pieces } from '@/engine/world/pieces';
import { sampleHeight, type TerrainData, type TerrainSpec } from '@/engine/world/terrain';
import type { MedalState } from '@/ui/components';
import { TerrainWater } from './TerrainWater';
import { Atmosphere } from './Atmosphere';
import { Batch } from './Batch';
import { TIERS, type Tier } from './quality';
import { useViewStore } from './viewStore';

export const STAGE_FOG: [number, number] = [260, 620];

const M = {
  stone: new THREE.MeshStandardMaterial({ color: '#ece3cf', roughness: 0.85, flatShading: true }),
  rim: new THREE.MeshStandardMaterial({ metalness: 0.5, roughness: 0.35 }),
  top: new THREE.MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0.2,
    emissive: '#ffb000',
    emissiveIntensity: 0.12,
  }),
  current: new THREE.MeshStandardMaterial({
    color: '#ff2d8a',
    emissive: '#ff2d8a',
    emissiveIntensity: 0.9,
    roughness: 0.35,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: '#ffc61a',
    metalness: 0.55,
    roughness: 0.28,
    emissive: '#ff9d00',
    emissiveIntensity: 0.25,
  }),
  dim: new THREE.MeshStandardMaterial({ color: '#c9d2e0', metalness: 0.2, roughness: 0.5 }),
  chest: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
  trim: new THREE.MeshStandardMaterial({ color: '#ffc61a', metalness: 0.7, roughness: 0.3 }),
  roadEdge: new THREE.MeshStandardMaterial({
    color: '#c89a5c',
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  }),
  roadTop: new THREE.MeshStandardMaterial({
    color: '#f2dcae',
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: -3,
  }),
  stoneStep: new THREE.MeshStandardMaterial({ color: '#e6cf9c', roughness: 0.9 }),
  pebble: new THREE.MeshStandardMaterial({ color: '#cbbfa7', flatShading: true }),
  castleStone: new THREE.MeshStandardMaterial({ color: '#efe6d4', roughness: 0.8 }),
  castleTrim: new THREE.MeshStandardMaterial({ color: '#d9ccb2', roughness: 0.85 }),
  castleRoof: new THREE.MeshStandardMaterial({ color: '#e2366f', flatShading: true, roughness: 0.5 }),
  castleGold: new THREE.MeshStandardMaterial({
    color: '#ffc61a',
    metalness: 0.6,
    roughness: 0.3,
    side: THREE.DoubleSide,
  }),
  castleDark: new THREE.MeshStandardMaterial({ color: '#3b2416', emissive: '#ffcf6a', emissiveIntensity: 0.08 }),
  board: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
  plank: new THREE.MeshStandardMaterial({ color: '#b07a45', roughness: 0.9 }),
  pick: new THREE.MeshBasicMaterial({ visible: false }),
};
const beamTex = (() => {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = 4;
  cv.height = 128;
  const g = cv.getContext('2d');
  if (!g) return null;
  const lg = g.createLinearGradient(0, 128, 0, 0);
  lg.addColorStop(0, 'rgba(255,120,190,.85)');
  lg.addColorStop(1, 'rgba(255,120,190,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(cv);
})();

const TOP: Record<MedalState, string> = {
  cleared: '#ffcf3a',
  available: '#5cc8f5',
  current: '#ff2d8a',
  locked: '#b7c1cf',
};
const RIM: Record<MedalState, string> = {
  cleared: '#e8b04a',
  available: '#e8b04a',
  current: '#e8b04a',
  locked: '#9aa6b8',
};

interface Props {
  stageId: string;
  layout: StageLayout;
  tier: Tier;
  medal: (levelId: string) => MedalState;
  stars: (levelId: string) => number;
  bossOpen: boolean;
  onPickLevel: (levelId: string) => void;
}

/** One stage = one island: the numbered road, pedestals, bonus chests, unit signposts and the boss castle. */
export function StageScene({ stageId, layout, tier, medal, stars, bossOpen, onPickLevel }: Props) {
  const q = TIERS[tier];
  const P = pieces();
  const spec: TerrainSpec = useMemo(
    () => ({
      seed: hashString(stageId),
      bounds: layout.bounds,
      segX: tier === 'lite' ? 200 : 300,
      segZ: tier === 'lite' ? 140 : 210,
      islands: [layout.island],
    }),
    [stageId, layout, tier],
  );
  const [terrain, setTerrain] = useState<TerrainData | null>(null);
  const setSampler = useViewStore((s) => s.setSampler);
  const setHovered = useViewStore((s) => s.setHovered);
  const onReady = useCallback(
    (t: TerrainData) => {
      setTerrain(t);
      setSampler(`stage:${stageId}`, (x, z) => sampleHeight(t, x, z));
    },
    [setSampler, stageId],
  );
  const h = useCallback((x: number, z: number) => (terrain ? sampleHeight(terrain, x, z) : 0), [terrain]);

  const road = useMemo(() => (terrain ? buildRoad(layout.road, h) : null), [terrain, layout.road, h]);
  const props = useMemo(() => {
    if (!terrain || !road) return [];
    const avoid = [
      ...road.samples.filter((_, k) => k % 4 === 0).map((p) => ({ x: p.x, z: p.z, r: 4.4 })),
      ...layout.pedestals.map((p) => ({ x: p.x, z: p.z, r: 5 })),
      ...layout.chests.map((p) => ({ x: p.x, z: p.z, r: 3.5 })),
      ...layout.signposts.map((p) => ({ x: p.x, z: p.z, r: 2 })),
      { x: layout.castle.x, z: layout.castle.z, r: 14 },
    ];
    const island = { ...layout.island };
    return buildProps(terrain, [island], q.props * 1.8, 1, avoid);
  }, [terrain, road, layout, q.props]);

  const ped = useMemo(
    () => layout.pedestals.map((p) => ({ ...p, y: h(p.x, p.z), state: medal(p.levelId) })),
    [layout.pedestals, h, medal],
  );
  const current = ped.find((p) => p.state === 'current');
  const starItems = useMemo(() => {
    const gold: Instance[] = [];
    const dim: Instance[] = [];
    for (const p of ped) {
      if (p.state !== 'cleared') continue;
      const n = stars(p.levelId);
      for (let k = 0; k < 3; k++)
        (k < n ? gold : dim).push({
          x: p.x + (k - 1) * 2.9,
          y: p.y + 7.4 + (k === 1 ? 0.9 : 0),
          z: p.z,
          s: k === 1 ? 1.35 : 1.1,
          rx: -0.25,
          ry: (k - 1) * -0.25,
        });
    }
    return { gold, dim };
  }, [ped, stars]);
  const chests = useMemo(
    () => layout.chests.map((c) => ({ ...c, y: h(c.x, c.z), open: medal(c.levelId) !== 'locked' })),
    [layout.chests, h, medal],
  );
  const signs = useMemo(() => layout.signposts.map((s) => ({ ...s, y: h(s.x, s.z) })), [layout.signposts, h]);

  const gem = useMemo(() => new THREE.Object3D(), []);
  const reduced = useReducedMotion();
  useFrame((_, dt) => {
    if (!reduced) gem.rotation.y += dt * 0.8;
  });

  const over = (id: string) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(id);
    document.body.style.cursor = 'pointer';
  };
  const out = () => {
    setHovered(null);
    document.body.style.cursor = '';
  };
  const pick = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onPickLevel(id);
  };

  const cy = h(layout.castle.x, layout.castle.z);
  const shadow = q.shadows;
  return (
    <>
      <Atmosphere bounds={layout.bounds} tier={tier} fogNear={STAGE_FOG[0]} fogFar={STAGE_FOG[1]} />
      <TerrainWater spec={spec} fogNear={STAGE_FOG[0]} fogFar={STAGE_FOG[1]} onReady={onReady} />
      {terrain && road ? (
        <>
          <mesh geometry={road.edge} material={M.roadEdge} receiveShadow />
          <mesh geometry={road.surface} material={M.roadTop} receiveShadow />
          <Batch
            geometry={P.pedestalBase}
            material={M.stoneStep}
            items={road.stones.map((s) => ({ ...s, sy: 0.1 }))}
            castShadow={false}
          />
          <Batch
            geometry={kit().rock}
            material={M.pebble}
            items={road.pebbles.map((p) => ({ ...p, s: (p.s ?? 0.4) * 0.6 }))}
            castShadow={false}
          />
          {props.map((b) => (
            <Batch
              key={b.key}
              geometry={b.geometry}
              material={b.material}
              items={b.items}
              castShadow={shadow && b.castShadow}
            />
          ))}
          <Batch
            geometry={P.pedestalBase}
            material={M.stone}
            items={ped.map((p) => ({ x: p.x, y: p.y, z: p.z }))}
            castShadow={shadow}
          />
          <Batch
            geometry={P.pedestalRim}
            material={M.rim}
            items={ped.map((p) => ({ x: p.x, y: p.y, z: p.z, color: RIM[p.state] }))}
            castShadow={false}
          />
          <Batch
            geometry={P.pedestalTop}
            material={M.top}
            items={ped
              .filter((p) => p.state !== 'current')
              .map((p) => ({ x: p.x, y: p.y, z: p.z, color: TOP[p.state] }))}
            castShadow={false}
          />
          <Batch geometry={P.star} material={M.gold} items={starItems.gold} castShadow={shadow} />
          <Batch geometry={P.star} material={M.dim} items={starItems.dim} castShadow={shadow} />
          <Batch
            geometry={P.chestBody}
            material={M.chest}
            items={chests.map((c) => ({ x: c.x, y: c.y, z: c.z, ry: 0.3, color: c.open ? '#9c5a2b' : '#8d97a8' }))}
            castShadow={shadow}
          />
          <Batch
            geometry={P.chestLid}
            material={M.chest}
            items={chests.map((c) => ({ x: c.x, y: c.y, z: c.z, ry: 0.3, color: c.open ? '#b86d34' : '#a3adbd' }))}
            castShadow={shadow}
          />
          <Batch
            geometry={P.chestTrim}
            material={M.trim}
            items={chests.map((c) => ({ x: c.x, y: c.y, z: c.z, ry: 0.3 }))}
            castShadow={false}
          />
          <Batch
            geometry={P.post}
            material={mats().wood!}
            items={signs.map((s) => ({ x: s.x, y: s.y, z: s.z, color: '#8a5a34' }))}
            castShadow={shadow}
          />
          <Batch
            geometry={P.board}
            material={M.board}
            items={signs.map((s, k) => ({
              x: s.x,
              y: s.y,
              z: s.z,
              ry: 0.2,
              color: ['#22b6f2', '#16d27f', '#f59e0b', '#8b5cf6', '#f43f8e', '#ff7a1a'][k % 6]!,
            }))}
            castShadow={shadow}
          />
          <group position={[layout.castle.x, cy - 0.3, layout.castle.z]} rotation-y={-0.25}>
            <mesh geometry={P.castleStone} material={M.castleStone} castShadow={shadow} receiveShadow />
            <mesh geometry={P.castleTrim} material={M.castleTrim} castShadow={shadow} receiveShadow />
            <mesh geometry={P.castleRoof} material={M.castleRoof} castShadow={shadow} />
            <mesh geometry={P.castleGold} material={M.castleGold} />
            <mesh geometry={P.castleDark} material={M.castleDark} />
            <pointLight
              position={[0, 10, 10]}
              color={bossOpen ? '#ffc61a' : '#ff3d8b'}
              intensity={120}
              distance={40}
              decay={2}
            />
            <mesh
              position={[0, 6, 3]}
              material={M.pick}
              onClick={pick('__boss')}
              onPointerOver={over('boss')}
              onPointerOut={out}
            >
              <boxGeometry args={[18, 14, 16]} />
            </mesh>
          </group>
          {Array.from({ length: 7 }, (_, k) => (
            <mesh
              key={k}
              material={M.plank}
              position={[layout.dock.x - 2 - k * 0.2, 0.55, layout.dock.z + 4 + k * 1.3]}
              castShadow={shadow}
              receiveShadow
            >
              <boxGeometry args={[3, 0.25, 1.2]} />
            </mesh>
          ))}
          {current ? (
            <group position={[current.x, current.y, current.z]}>
              <mesh geometry={P.pedestalTop} material={M.current} />
              {beamTex ? (
                <mesh geometry={P.beam}>
                  <meshBasicMaterial
                    map={beamTex}
                    transparent
                    depthWrite={false}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              ) : null}
              <primitive object={gem} position={[0, 7.2, 0]}>
                <mesh geometry={P.gem} castShadow={shadow}>
                  <meshStandardMaterial
                    color="#ff4fa3"
                    metalness={0.3}
                    roughness={0.15}
                    emissive="#ff1f8a"
                    emissiveIntensity={0.6}
                    flatShading
                  />
                </mesh>
              </primitive>
              <pointLight position={[0, 3, 0]} color="#ff4fa3" intensity={60} distance={18} decay={2} />
            </group>
          ) : null}
          {ped.map((p) => (
            <mesh
              key={p.levelId}
              position={[p.x, p.y + 1.5, p.z]}
              material={M.pick}
              onClick={pick(p.levelId)}
              onPointerOver={over(`level:${p.levelId}`)}
              onPointerOut={out}
            >
              <cylinderGeometry args={[3.4, 3.4, 4, 12]} />
            </mesh>
          ))}
          {chests.map((c) => (
            <mesh
              key={c.levelId}
              position={[c.x, c.y + 1, c.z]}
              material={M.pick}
              onClick={pick(c.levelId)}
              onPointerOver={over(`level:${c.levelId}`)}
              onPointerOut={out}
            >
              <boxGeometry args={[3.4, 3, 3]} />
            </mesh>
          ))}
        </>
      ) : null}
    </>
  );
}
