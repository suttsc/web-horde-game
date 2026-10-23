import type { GateSpec } from '../game/types';

export const add = (value: number): GateSpec => ({ op: 'add', value });
export const mul = (value: number): GateSpec => ({ op: 'mul', value });
