import { useEffect, useRef } from 'react';
import { rng } from '@/engine/lesson/testEngine';
import { useCalm } from './useCalm';

const COLORS = ['#ffcf3a', '#f43f8e', '#22b6f2', '#16d27f', '#8b5cf6', '#ff7a1a', '#ffffff'];

interface Props {
  /** Particle count — scales with the celebration tier. */
  count: number;
  /** Seconds the burst lasts. */
  duration: number;
  /** 'burst' = from a point; 'rain' = across the top; 'fireworks' = several bursts over time. */
  kind?: 'burst' | 'rain' | 'fireworks';
  /** Burst origin as a fraction of the canvas (0..1). */
  origin?: [number, number];
  className?: string;
}

/** Canvas confetti. Purely decorative (aria-hidden); never rendered in calm / reduced-motion mode. */
export function Confetti({ count, duration, kind = 'burst', origin = [0.5, 0.35], className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const calm = useCalm();
  useEffect(() => {
    const cv = ref.current;
    if (calm || !cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      cv.width = cv.clientWidth * dpr;
      cv.height = cv.clientHeight * dpr;
    };
    resize();
    const r = rng(count * 7919 + Math.round(duration * 100));
    const W = () => cv.width;
    const H = () => cv.height;
    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      rot: number;
      vr: number;
      w: number;
      h: number;
      c: string;
      t0: number;
    };
    const parts: P[] = [];
    const bursts = kind === 'fireworks' ? 5 : 1;
    for (let i = 0; i < count; i++) {
      const b = i % bursts;
      const t0 = kind === 'fireworks' ? b * (duration / (bursts + 1)) : 0;
      const ox = kind === 'fireworks' ? 0.2 + 0.6 * r() : origin[0];
      const oy = kind === 'fireworks' ? 0.15 + 0.3 * r() : origin[1];
      const a = r() * Math.PI * 2;
      const sp = (kind === 'rain' ? 0.2 : 0.55 + r() * 0.9) * dpr;
      parts.push({
        x: kind === 'rain' ? r() * W() : ox * W(),
        y: kind === 'rain' ? -20 * dpr - r() * H() * 0.3 : oy * H(),
        vx: kind === 'rain' ? (r() - 0.5) * 2 * dpr : Math.cos(a) * sp * 9,
        vy: kind === 'rain' ? (2 + r() * 3) * dpr : Math.sin(a) * sp * 9 - 4 * dpr,
        rot: r() * 6.3,
        vr: (r() - 0.5) * 0.3,
        w: (5 + r() * 6) * dpr,
        h: (8 + r() * 8) * dpr,
        c: COLORS[Math.floor(r() * COLORS.length)]!,
        t0,
      });
    }
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      g.clearRect(0, 0, W(), H());
      for (const p of parts) {
        if (t < p.t0) continue;
        p.vy += 0.22 * dpr;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        const life = 1 - Math.max(0, (t - duration * 0.7) / (duration * 0.3));
        if (life <= 0 || p.y > H() + 40) continue;
        g.save();
        g.globalAlpha = life;
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = p.c;
        g.fillRect(-p.w / 2, -p.h / 2, p.w, Math.abs(Math.cos(p.rot * 1.7)) * p.h + 1);
        g.restore();
      }
      if (t < duration) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [calm, count, duration, kind, origin]);
  if (calm) return null;
  return <canvas ref={ref} aria-hidden className={className ?? 'pointer-events-none absolute inset-0 size-full'} />;
}
