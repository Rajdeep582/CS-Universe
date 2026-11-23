import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import * as THREE from 'three';
import { requestTerrain } from '@/engine/world/terrainClient';
import type { TerrainData, TerrainSpec } from '@/engine/world/terrain';
import { createWaterMaterial } from '@/engine/world/water';
import { FOG, SUN_DIR } from './Atmosphere';

/** Requests a heightfield from the worker and renders terrain + ocean. Calls `onReady` with the data (for props, labels, picking). */
export function TerrainWater({
  spec,
  fogNear,
  fogFar,
  onReady,
}: {
  spec: TerrainSpec;
  fogNear: number;
  fogFar: number;
  onReady: (t: TerrainData) => void;
}) {
  const [data, setData] = useState<TerrainData | null>(null);
  const key = useMemo(() => JSON.stringify(spec), [spec]);
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    let live = true;
    setData(null);
    void requestTerrain(spec).then((t) => {
      if (!live) return;
      setData(t);
      ready.current(t);
    });
    return () => {
      live = false;
    };
    // spec identity is captured by key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const geometry = useMemo(() => {
    if (!data) return null;
    const { bounds, segX, segZ } = data;
    const g = new THREE.PlaneGeometry(bounds.x1 - bounds.x0, bounds.z1 - bounds.z0, segX, segZ);
    g.rotateX(-Math.PI / 2);
    g.translate((bounds.x0 + bounds.x1) / 2, 0, (bounds.z0 + bounds.z1) / 2);
    // After rotateX(-90°) the plane's rows run from z0 to z1 — the same row-major order as the generated grid.
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < pos.count; k++) pos.setY(k, data.heights[k]!);
    const colors = data.colors;
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [data]);

  const water = useMemo(
    () => (data ? createWaterMaterial(data, SUN_DIR, FOG, fogNear, fogFar) : null),
    [data, fogNear, fogFar],
  );
  const terrainMat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 }),
    [],
  );
  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(
    () => () => {
      (water?.uniforms.hmap?.value as THREE.Texture | undefined)?.dispose();
      water?.dispose();
    },
    [water],
  );
  useEffect(() => () => terrainMat.dispose(), [terrainMat]);

  const reduced = useReducedMotion();
  useFrame((_, dt) => {
    if (water && !reduced) water.uniforms.t!.value += dt * 0.6;
  });

  if (!geometry || !water) return null;
  return (
    <>
      <mesh geometry={geometry} material={terrainMat} receiveShadow castShadow />
      <mesh material={water} rotation-x={-Math.PI / 2} position-y={0}>
        <planeGeometry args={[3000, 3000, 1, 1]} />
      </mesh>
    </>
  );
}
