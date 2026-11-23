import { useLayoutEffect, useRef } from 'react';
import type * as THREE from 'three';
import { fillInstances, type Instance } from '@/engine/world/props';

/** One instanced draw call for many copies of a prop. */
export function Batch({
  geometry,
  material,
  items,
  castShadow = true,
  receiveShadow = true,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  items: Instance[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (ref.current) fillInstances(ref.current, items);
  }, [items]);
  if (!items.length) return null;
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[geometry, material, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );
}
