/** Ids of every simulation the lesson player can embed. The build fails if a lesson names any other. */
export const SIMULATION_IDS = ['tiny-machine', 'page-replacement'] as const;
export type SimulationId = (typeof SIMULATION_IDS)[number];
