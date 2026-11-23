/**
 * Page replacement — FIFO, OPT (Bélády's optimal) and LRU — following Silberschatz, Galvin & Gagne,
 * Operating System Concepts 10e, ch. 10. Frames are physical slots: a victim's slot receives the new page.
 */
export type Policy = 'FIFO' | 'OPT' | 'LRU';

export interface PageStep {
  page: number;
  /** Frame contents after this reference (null = empty frame). */
  frames: (number | null)[];
  fault: boolean;
  victim: number | null;
}

export function simulatePaging(
  refs: readonly number[],
  frameCount: number,
  policy: Policy,
): { steps: PageStep[]; faults: number } {
  if (!Number.isInteger(frameCount) || frameCount < 1) throw new RangeError('frameCount must be a positive integer');
  const frames: (number | null)[] = Array(frameCount).fill(null);
  const loadedAt = new Map<number, number>();
  const lastUsed = new Map<number, number>();
  const steps: PageStep[] = [];
  let faults = 0;
  refs.forEach((page, t) => {
    let victim: number | null = null;
    const hit = frames.includes(page);
    if (!hit) {
      faults++;
      const empty = frames.indexOf(null);
      let slot = empty;
      if (empty === -1) {
        const resident = frames as number[];
        if (policy === 'FIFO') victim = resident.reduce((a, b) => (loadedAt.get(a)! <= loadedAt.get(b)! ? a : b));
        else if (policy === 'LRU') victim = resident.reduce((a, b) => (lastUsed.get(a)! <= lastUsed.get(b)! ? a : b));
        else {
          // OPT: evict the page whose next use is farthest away (never used again = infinitely far). Ties: lowest slot.
          const nextUse = (p: number) => {
            const i = refs.indexOf(p, t + 1);
            return i === -1 ? Infinity : i;
          };
          victim = resident.reduce((a, b) => (nextUse(b) > nextUse(a) ? b : a));
        }
        slot = frames.indexOf(victim);
        loadedAt.delete(victim);
      }
      frames[slot] = page;
      loadedAt.set(page, t);
    }
    lastUsed.set(page, t);
    steps.push({ page, frames: [...frames], fault: !hit, victim });
  });
  return { steps, faults };
}
