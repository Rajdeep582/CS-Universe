import type { Simulation } from '../types';

/**
 * Tiny Machine: a minimal stored-program computer (von Neumann style).
 * Instructions and data share one memory; the CPU repeats fetch → decode → execute.
 * Used by "What Is a Computer?" — deliberately tiny, but the cycle is the real one.
 */
export type Op = 'LOAD' | 'ADD' | 'SUB' | 'STORE' | 'OUT' | 'HALT';
export interface Instr {
  op: Op;
  arg?: number;
}
export type Cell = Instr | number;
export type Phase = 'fetch' | 'decode' | 'execute';

export interface MachineState {
  memory: Cell[];
  /** Program counter: address of the next instruction. */
  pc: number;
  /** Instruction register: the instruction just fetched. */
  ir: Instr | null;
  /** Accumulator: the CPU's single working register. */
  acc: number;
  phase: Phase;
  output: number[];
  halted: boolean;
  error: string | null;
  cycle: number;
}

export interface MachineConfig {
  memory: Cell[];
}

const isInstr = (c: Cell | undefined): c is Instr => typeof c === 'object' && c !== null;
const fmt = (i: Instr) => (i.arg === undefined ? i.op : `${i.op} ${i.arg}`);

function readNumber(s: MachineState, addr: number | undefined): number | string {
  if (addr === undefined || addr < 0 || addr >= s.memory.length) return `address ${addr} is outside memory`;
  const v = s.memory[addr];
  return typeof v === 'number' ? v : `address ${addr} holds an instruction, not a number`;
}

export const tinyMachine: Simulation<MachineState, MachineConfig> = {
  id: 'tiny-machine',
  init: ({ memory }) => ({
    memory: [...memory],
    pc: 0,
    ir: null,
    acc: 0,
    phase: 'fetch',
    output: [],
    halted: false,
    error: null,
    cycle: 0,
  }),
  done: (s) => s.halted,
  step(s) {
    if (s.halted) return s;
    if (s.phase === 'fetch') {
      const c = s.memory[s.pc];
      if (!isInstr(c)) return { ...s, halted: true, error: `address ${s.pc} does not hold an instruction` };
      return { ...s, ir: c, pc: s.pc + 1, phase: 'decode' };
    }
    if (s.phase === 'decode') return { ...s, phase: 'execute' };
    const ir = s.ir!;
    const next = { ...s, phase: 'fetch' as Phase, cycle: s.cycle + 1 };
    switch (ir.op) {
      case 'LOAD':
      case 'ADD':
      case 'SUB': {
        const v = readNumber(s, ir.arg);
        if (typeof v === 'string') return { ...next, halted: true, error: v };
        return { ...next, acc: ir.op === 'LOAD' ? v : ir.op === 'ADD' ? s.acc + v : s.acc - v };
      }
      case 'STORE': {
        if (ir.arg === undefined || ir.arg < 0 || ir.arg >= s.memory.length)
          return { ...next, halted: true, error: `address ${ir.arg} is outside memory` };
        const memory = [...s.memory];
        memory[ir.arg] = s.acc;
        return { ...next, memory };
      }
      case 'OUT':
        return { ...next, output: [...s.output, s.acc] };
      case 'HALT':
        return { ...next, halted: true };
    }
  },
  describe(s) {
    if (s.error) return `Stopped with an error: ${s.error}.`;
    if (s.halted) return `Halted. Output: ${s.output.length ? s.output.join(', ') : 'nothing'}.`;
    if (s.phase === 'fetch') return `Fetch: read the instruction at address ${s.pc} into the instruction register.`;
    if (s.phase === 'decode') return `Decode: ${fmt(s.ir!)} — work out what this instruction asks for.`;
    return `Execute: carry out ${fmt(s.ir!)}. Accumulator is ${s.acc}.`;
  },
};

/** The lesson's default program: add the numbers in addresses 6 and 7, store and output the sum. */
export const ADD_PROGRAM: Cell[] = [
  { op: 'LOAD', arg: 6 },
  { op: 'ADD', arg: 7 },
  { op: 'STORE', arg: 8 },
  { op: 'OUT' },
  { op: 'HALT' },
  0,
  2,
  3,
  0,
];
