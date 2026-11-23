import { useEffect, useState } from 'react';
import { useCalm } from './useCalm';

/** Counts from 0 to `value` over `ms` (static in calm mode). The final value settles within a second. */
export function CountUp({ value, ms = 900, delay = 0 }: { value: number; ms?: number; delay?: number }) {
  const calm = useCalm();
  const [v, setV] = useState(calm ? value : 0);
  useEffect(() => {
    if (calm) return;
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - start) / ms));
      setV(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [calm, value, ms, delay]);
  return <span className="tabular-nums">{(calm ? value : v).toLocaleString('en-US')}</span>;
}
