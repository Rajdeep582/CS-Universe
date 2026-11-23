import { useMemo } from 'react';
import * as THREE from 'three';
import { TIERS, type Tier } from './quality';
import type { Bounds } from '@/engine/world/terrain';

export const FOG = new THREE.Color('#bfeaff');
export const SUN_DIR = new THREE.Vector3(-90, 140, 70).normalize();

/** Sky colour, haze, hemisphere fill and the shadow-casting sun sized to the scene bounds. */
export function Atmosphere({
  bounds,
  tier,
  fogNear,
  fogFar,
}: {
  bounds: Bounds;
  tier: Tier;
  fogNear: number;
  fogFar: number;
}) {
  const q = TIERS[tier];
  const cx = (bounds.x0 + bounds.x1) / 2;
  const cz = (bounds.z0 + bounds.z1) / 2;
  const half = Math.max(bounds.x1 - bounds.x0, bounds.z1 - bounds.z0) * 0.45;
  const sunPos = useMemo(
    () =>
      SUN_DIR.clone()
        .multiplyScalar(220)
        .add(new THREE.Vector3(cx, 0, cz)),
    [cx, cz],
  );
  return (
    <>
      <color attach="background" args={[FOG]} />
      <fog attach="fog" args={[FOG, fogNear, fogFar]} />
      <hemisphereLight args={['#d8f3ff', '#5a7a46', 1.15]} />
      <directionalLight
        key={`${tier}-${cx}-${cz}`}
        position={sunPos}
        intensity={2.9}
        color="#fff1d6"
        castShadow={q.shadows}
        shadow-mapSize={[q.shadowMap, q.shadowMap]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.35}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={10}
        shadow-camera-far={520}
      >
        <object3D attach="target" position={[cx, 0, cz]} />
      </directionalLight>
    </>
  );
}
