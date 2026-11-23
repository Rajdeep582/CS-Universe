import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { clsx } from 'clsx';

type Anchor = 'above' | 'below' | 'center';
interface Entry {
  el: HTMLElement;
  pos: THREE.Vector3;
  priority: number;
  anchor: Anchor;
  offset: number;
  behind: boolean;
}

/** Live registry of DOM labels anchored to 3D points (filled by <Label>, read by <LabelProjector>). */
const registry = new Map<string, Entry>();

interface LabelProps {
  id: string;
  position: [number, number, number];
  /** Higher wins when two labels collide. */
  priority?: number;
  anchor?: Anchor;
  /** Extra screen-space gap in px between anchor and label. */
  offset?: number;
  className?: string;
  children: ReactNode;
}

/** A DOM element pinned to a world position. Must be rendered inside <LabelLayer>. */
export function Label({ id, position, priority = 0, anchor = 'above', offset = 0, className, children }: LabelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [x, y, z] = position;
  useLayoutEffect(() => {
    const el = ref.current!;
    registry.set(id, { el, pos: new THREE.Vector3(x, y, z), priority, anchor, offset, behind: false });
    return () => {
      registry.delete(id);
    };
  }, [id, x, y, z, priority, anchor, offset]);
  return (
    <div ref={ref} data-hidden="1" className={clsx('world-label', className)}>
      {children}
    </div>
  );
}

export function LabelLayer({ children }: { children: ReactNode }) {
  return <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">{children}</div>;
}

const overlaps = (a: DOMRect, b: DOMRect, pad = 6) =>
  a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;

/** Inside <Canvas>: projects every label each frame; every few frames hides lower-priority labels that collide with others or with HUD panels ([data-hud]). */
export function LabelProjector() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useRef(new THREE.Vector3());
  const frame = useRef(0);
  useFrame(() => {
    for (const e of registry.values()) {
      v.current.copy(e.pos).project(camera);
      e.behind = v.current.z > 1 || Math.abs(v.current.x) > 1.15 || Math.abs(v.current.y) > 1.15;
      const sx = ((v.current.x + 1) / 2) * size.width;
      const sy = ((1 - v.current.y) / 2) * size.height;
      const ty = e.anchor === 'above' ? `calc(-100% - ${e.offset}px)` : e.anchor === 'below' ? `${e.offset}px` : '-50%';
      e.el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, ${ty})`;
    }
    if (frame.current++ % 6) return;
    const hud = [...document.querySelectorAll('[data-hud]')].map((h) => h.getBoundingClientRect());
    const placed: DOMRect[] = [];
    const list = [...registry.values()].sort((a, b) => b.priority - a.priority);
    for (const e of list) {
      if (e.behind) {
        e.el.dataset.hidden = '1';
        continue;
      }
      const r = e.el.getBoundingClientRect();
      const offscreen = r.left < 4 || r.top < 4 || r.right > window.innerWidth - 4 || r.bottom > window.innerHeight - 4;
      const blocked = offscreen || hud.some((h) => overlaps(r, h, 4)) || placed.some((p) => overlaps(r, p));
      e.el.dataset.hidden = blocked ? '1' : '0';
      if (!blocked) placed.push(r);
    }
  });
  return null;
}
