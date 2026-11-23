/**
 * A simulation is a pure, deterministic state machine. The UI keeps every state in a timeline,
 * so stepping back and scrubbing are free and the core logic stays unit-testable.
 */
export interface Simulation<S, C> {
  id: string;
  init(config: C): S;
  /** Next state; must not mutate `s`. */
  step(s: S): S;
  done(s: S): boolean;
  /** One plain-language sentence describing the state (screen readers, captions). */
  describe(s: S): string;
}

/** Runs a simulation to completion (or `max` states) and returns the full timeline. */
export function timeline<S, C>(sim: Simulation<S, C>, config: C, max = 500): S[] {
  const out = [sim.init(config)];
  while (!sim.done(out[out.length - 1]!) && out.length < max) out.push(sim.step(out[out.length - 1]!));
  return out;
}
