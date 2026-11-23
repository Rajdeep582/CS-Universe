/** Ids of every simulation the lesson player can embed. The build fails if a lesson names any other. */
export const SIMULATION_IDS = [
  'tiny-machine',
  'page-replacement',
  'binary-board',
  'base-converter',
  'twos-complement',
  'float-explorer',
] as const;
export type SimulationId = (typeof SIMULATION_IDS)[number];
