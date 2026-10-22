import type { GateSpec } from '../game/types';
import type { LevelDefinition } from './types';

const add = (value: number): GateSpec => ({ op: 'add', value });
const mul = (value: number): GateSpec => ({ op: 'mul', value });

/**
 * Level 1: "Outbreak". About 75s + the boss fight.
 * Things spawn just above the screen and take roughly 6s to reach the squad.
 */
export const level1: LevelDefinition = {
  id: 1,
  name: 'Outbreak',
  seed: 1337,
  events: [
    { at: 0.5, type: 'banner', text: 'Wave 1' },
    { at: 1, type: 'gates', left: add(4), right: add(-2) },
    { at: 4, type: 'horde', count: 5, hp: 3, spread: 120 },
    { at: 7, type: 'crate', x: 180, hp: 25, upgrade: 'fireRate' },
    { at: 9, type: 'horde', count: 8, hp: 3, x: 120, spread: 160 },
    { at: 12, type: 'gates', left: mul(2), right: add(5) },

    { at: 16, type: 'banner', text: 'Wave 2' },
    { at: 16, type: 'horde', count: 14, hp: 8, spread: 260 },
    { at: 20, type: 'crate', x: 100, hp: 90, upgrade: 'damage' },
    { at: 21, type: 'horde', count: 12, hp: 8, x: 250, spread: 140 },
    { at: 25, type: 'gates', left: add(-6), right: add(-3) },

    { at: 30, type: 'banner', text: 'Wave 3' },
    { at: 30, type: 'horde', count: 22, hp: 14, spread: 280 },
    { at: 34, type: 'crate', x: 250, hp: 260, upgrade: 'spread' },
    { at: 35, type: 'horde', count: 2, hp: 90, kind: 'brute', x: 110, spread: 60 },
    { at: 38, type: 'gates', left: mul(2), right: add(12) },
    { at: 42, type: 'horde', count: 28, hp: 18, spread: 280 },

    { at: 47, type: 'banner', text: 'Wave 4' },
    { at: 47, type: 'gates', left: add(-10), right: mul(2) },
    { at: 51, type: 'horde', count: 34, hp: 26, spread: 290 },
    { at: 53, type: 'horde', count: 3, hp: 220, kind: 'brute', spread: 220 },
    { at: 56, type: 'crate', x: 180, hp: 700, upgrade: 'damage' },
    { at: 59, type: 'horde', count: 40, hp: 30, spread: 290 },
    { at: 62, type: 'horde', count: 4, hp: 260, kind: 'brute', spread: 240 },
    { at: 66, type: 'gates', left: add(15), right: add(-8) },

    { at: 71, type: 'banner', text: 'BOSS' },
    { at: 72, type: 'boss', hp: 8000 },
    { at: 76, type: 'horde', count: 18, hp: 30, spread: 290 },
    { at: 84, type: 'horde', count: 18, hp: 30, spread: 290 },
  ],
};
