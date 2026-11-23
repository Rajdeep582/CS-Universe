/** Rank ladder from docs/blueprint/03-progression-and-rewards.md §3. */
export const RANKS = [
  { name: 'Bit', xp: 0 },
  { name: 'Nibble', xp: 150 },
  { name: 'Byte', xp: 500 },
  { name: 'Word', xp: 1_200 },
  { name: 'Register', xp: 2_500 },
  { name: 'Pointer', xp: 4_500 },
  { name: 'Stack Frame', xp: 7_500 },
  { name: 'Process', xp: 12_000 },
  { name: 'Kernel', xp: 18_000 },
  { name: 'Protocol', xp: 26_000 },
  { name: 'Compiler', xp: 36_000 },
  { name: 'Cluster', xp: 50_000 },
  { name: 'Consensus', xp: 68_000 },
  { name: 'Architect', xp: 92_000 },
  { name: 'Turing', xp: 125_000 },
  { name: 'Universal', xp: 170_000 },
] as const;

export interface RankInfo {
  /** 1-based rank number. */
  number: number;
  name: string;
  floorXp: number;
  next: { name: string; xp: number } | null;
  /** 0..1 progress from this rank's floor to the next rank (1 at max rank). */
  progress: number;
}

export function rankFor(xp: number): RankInfo {
  if (!Number.isFinite(xp) || xp < 0) throw new RangeError(`xp must be a finite number ≥ 0, got ${xp}`);
  let i = 0;
  while (i + 1 < RANKS.length && RANKS[i + 1]!.xp <= xp) i++;
  const cur = RANKS[i]!;
  const nxt = RANKS[i + 1];
  return {
    number: i + 1,
    name: cur.name,
    floorXp: cur.xp,
    next: nxt ? { name: nxt.name, xp: nxt.xp } : null,
    progress: nxt ? (xp - cur.xp) / (nxt.xp - cur.xp) : 1,
  };
}
