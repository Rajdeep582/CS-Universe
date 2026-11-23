import { useEffect, useRef } from 'react';
import { CameraControls } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import * as THREE from 'three';
import { useCamera } from './cameraStore';

/** Spring-damped camera: glides between shots, constrained orbit/pan/zoom, keyboard pan and zoom. */
export function CameraRig() {
  const ref = useRef<CameraControls>(null);
  const shot = useCamera((s) => s.shot);
  const bounds = useCamera((s) => s.bounds);
  const limits = useCamera((s) => s.limits);
  const reduced = useReducedMotion();

  useEffect(() => {
    const c = ref.current;
    if (!c || !shot) return;
    void c.setLookAt(...shot.position, ...shot.target, !reduced);
  }, [shot, reduced]);

  useEffect(() => {
    const c = ref.current;
    if (!c || !bounds) return;
    c.setBoundary(
      new THREE.Box3(new THREE.Vector3(bounds.x0, -5, bounds.z0), new THREE.Vector3(bounds.x1, 40, bounds.z1)),
    );
    c.minDistance = limits.minDistance;
    c.maxDistance = limits.maxDistance;
  }, [bounds, limits]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = ref.current;
      const t = e.target as HTMLElement | null;
      if (!c || (t && (t.closest('input, textarea, [role="dialog"]') || t.isContentEditable))) return;
      const step = c.distance * 0.08;
      const anim = !reduced;
      if (e.key === 'ArrowLeft') void c.truck(-step, 0, anim);
      else if (e.key === 'ArrowRight') void c.truck(step, 0, anim);
      else if (e.key === 'ArrowUp') void c.forward(step, anim);
      else if (e.key === 'ArrowDown') void c.forward(-step, anim);
      else if (e.key === '+' || e.key === '=') void c.dolly(step * 1.5, anim);
      else if (e.key === '-' || e.key === '_') void c.dolly(-step * 1.5, anim);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reduced]);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={reduced ? 0 : 0.6}
      draggingSmoothTime={0.12}
      minPolarAngle={0.25}
      maxPolarAngle={1.15}
      dollyToCursor
      boundaryFriction={0.2}
    />
  );
}
