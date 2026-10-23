import { add, mul } from './gates';
import type { LevelDefinition } from './types';

/** Level 1: "Pinewood". Walkers only; learn gates and crates. */
export const level1: LevelDefinition = {
  id: 1,
  name: 'Pinewood',
  blurb: 'A quiet logging town. The first of them are shambling in.',
  seed: 101,
  stream: [
    { from: 2, to: 20, rate: [0.5, 1], hp: [2, 3], mix: { walker: 1 } },
    { from: 20, to: 44, rate: [1, 1.6], hp: [3, 6], mix: { walker: 1 } },
    { from: 44, to: 200, rate: [1.2, 1.6], hp: [6, 8], mix: { walker: 1 } },
  ],
  events: [
    { at: 0.5, type: 'banner', text: 'Pinewood' },
    { at: 1, type: 'gates', left: add(5), right: add(-1) },
    { at: 5, type: 'horde', count: 5, hp: 2, spread: 160 },
    { at: 7, type: 'crate', x: 180, hp: 20, upgrade: 'fireRate' },
    { at: 11, type: 'gates', left: add(4), right: mul(2) },
    { at: 15, type: 'horde', count: 8, hp: 3, spread: 240 },

    { at: 19, type: 'banner', text: 'Wave 2' },
    { at: 20, type: 'crate', x: 110, hp: 60, upgrade: 'damage' },
    { at: 23, type: 'gates', left: add(-3), right: add(6) },
    { at: 27, type: 'horde', count: 12, hp: 4, spread: 280 },
    { at: 31, type: 'gates', left: mul(2), right: add(8) },
    { at: 35, type: 'horde', count: 14, hp: 5, spread: 280 },
    { at: 38, type: 'crate', x: 250, hp: 120, upgrade: 'fireRate' },

    { at: 43, type: 'banner', text: 'BOSS' },
    { at: 44, type: 'boss', hp: 1500 },
  ],
};
