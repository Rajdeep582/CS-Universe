import { describe, expect, it } from 'vitest';
import { timeline } from '../types';
import { ADD_PROGRAM, tinyMachine } from './tinyMachine';
import { simulatePaging } from './pageReplacement';

describe('Tiny Machine', () => {
  it('runs fetch → decode → execute and outputs 2 + 3 = 5', () => {
    const tl = timeline(tinyMachine, { memory: ADD_PROGRAM });
    const end = tl[tl.length - 1]!;
    expect(end.halted).toBe(true);
    expect(end.error).toBeNull();
    expect(end.output).toEqual([5]);
    expect(end.memory[8]).toBe(5);
    expect(end.cycle).toBe(5); // five instructions executed
    expect(tl.slice(0, 4).map((s) => s.phase)).toEqual(['fetch', 'decode', 'execute', 'fetch']);
    expect(tl).toHaveLength(1 + 5 * 3);
  });
  it('is pure: stepping does not mutate the previous state', () => {
    const s0 = tinyMachine.init({ memory: ADD_PROGRAM });
    const frozen = JSON.stringify(s0);
    tinyMachine.step(s0);
    expect(JSON.stringify(s0)).toBe(frozen);
  });
  it('treats data as data: running into a number halts with an error', () => {
    const tl = timeline(tinyMachine, { memory: [{ op: 'LOAD', arg: 2 }, { op: 'OUT' }, 7] });
    const end = tl[tl.length - 1]!;
    expect(end.output).toEqual([7]);
    expect(end.error).toMatch(/address 2 does not hold an instruction/);
  });
  it('reports bad addresses', () => {
    const end = timeline(tinyMachine, { memory: [{ op: 'LOAD', arg: 99 }] }).at(-1)!;
    expect(end.error).toMatch(/outside memory/);
  });
  it('describes every state in words', () => {
    for (const s of timeline(tinyMachine, { memory: ADD_PROGRAM }))
      expect(tinyMachine.describe(s).length).toBeGreaterThan(10);
  });
});

describe('Page replacement (Silberschatz OSC 10e, ch. 10 reference string, 3 frames)', () => {
  const refs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
  it('FIFO: 15 faults', () => expect(simulatePaging(refs, 3, 'FIFO').faults).toBe(15));
  it('OPT: 9 faults', () => expect(simulatePaging(refs, 3, 'OPT').faults).toBe(9));
  it('LRU: 12 faults', () => expect(simulatePaging(refs, 3, 'LRU').faults).toBe(12));
  it('LRU keeps physical slots (first 7 references)', () => {
    const { steps } = simulatePaging(refs.slice(0, 7), 3, 'LRU');
    expect(steps.map((s) => s.frames)).toEqual([
      [7, null, null],
      [7, 0, null],
      [7, 0, 1],
      [2, 0, 1],
      [2, 0, 1],
      [2, 0, 3],
      [2, 0, 3],
    ]);
    expect(steps[5]!.victim).toBe(1);
  });
  it("shows Belady's anomaly for FIFO (1,2,3,4,1,2,5,1,2,3,4,5)", () => {
    const b = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
    expect(simulatePaging(b, 3, 'FIFO').faults).toBe(9);
    expect(simulatePaging(b, 4, 'FIFO').faults).toBe(10);
  });
  it('rejects invalid frame counts', () => expect(() => simulatePaging([1], 0, 'LRU')).toThrow(RangeError));
});
