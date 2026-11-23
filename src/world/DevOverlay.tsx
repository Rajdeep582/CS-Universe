import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { TIERS, useQuality } from './quality';
import { useViewStore } from './viewStore';

/** Inside <Canvas>: samples fps, draw calls and triangles twice a second. */
export function PerfProbe() {
  const gl = useThree((s) => s.gl);
  const dpr = useThree((s) => s.viewport.dpr);
  const setPerf = useViewStore((s) => s.setPerf);
  const acc = useRef({ t: 0, frames: 0 });
  useFrame((_, dt) => {
    acc.current.t += dt;
    acc.current.frames++;
    if (acc.current.t < 0.5) return;
    setPerf({
      fps: Math.round(acc.current.frames / acc.current.t),
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      dpr,
    });
    acc.current = { t: 0, frames: 0 };
  });
  return null;
}

/** F3 developer overlay: fps, draw calls, triangles, quality tier, pixel ratio. */
export function DevOverlay() {
  const show = useQuality((s) => s.overlay);
  const tier = useQuality((s) => s.tier);
  const mode = useQuality((s) => s.mode);
  const perf = useViewStore((s) => s.perf);
  if (!show) return null;
  return (
    <div
      data-hud
      role="status"
      aria-label="Performance overlay"
      className="glass-dark fixed left-6 top-[140px] z-40 rounded-2xl px-4 py-3 font-mono text-[12px] leading-5"
    >
      <div>FPS {perf.fps}</div>
      <div>Draw calls {perf.calls}</div>
      <div>Triangles {perf.triangles.toLocaleString('en-US')}</div>
      <div>
        Tier {TIERS[tier].label} {mode === 'auto' ? '(auto)' : ''}
      </div>
      <div>DPR {perf.dpr.toFixed(2)}</div>
      <div className="mt-1 text-white/60">F3 to hide</div>
    </div>
  );
}
