import { add, mul } from './gates';
import type { LevelDefinition } from './types';

/** Level 3: "Ashford". Stalkers and the first brutes appear. */
export const level3: LevelDefinition = {
  id: 3,
  name: 'Ashford',
  blurb: 'The suburbs burned. Something fast moves between the houses.',
  seed: 303,
  stream: [
    { from: 2, to: 16, rate: [0.8, 1.4], hp: [2, 4], mix: { walker: 3, runner: 1 } },
    {
      from: 16,
      to: 34,
      rate: [1.4, 2.1],
      hp: [3, 6],
      mix: { walker: 3, runner: 1, stalker: 0.6 },
    },
    {
      from: 34,
      to: 200,
      rate: [2.1, 2.7],
      hp: [6, 10],
      mix: { walker: 3, runner: 2, stalker: 1, bloater: 0.5 },
    },
  ],
  events: [
    { at: 0.5, type: 'banner', text: 'Ashford' },
    { at: 1, type: 'gates', left: add(4), right: add(-2) },
    { at: 5, type: 'horde', count: 8, hp: 3, spread: 180 },
    { at: 7, type: 'crate', x: 180, hp: 25, upgrade: 'fireRate' },
    { at: 10, type: 'horde', count: 10, hp: 4, x: 120, spread: 180, mix: { walker: 3, runner: 1 } },
    { at: 12, type: 'gates', left: mul(2), right: add(5) },

    { at: 16, type: 'banner', text: 'Wave 2' },
    { at: 17, type: 'horde', count: 4, hp: 4, spread: 240, mix: { stalker: 1 } },
    { at: 20, type: 'crate', x: 100, hp: 90, upgrade: 'damage' },
    { at: 23, type: 'horde', count: 1, hp: 5, x: 220, spread: 20, mix: { brute: 1 } },
    { at: 25, type: 'gates', left: add(-5), right: add(-2) },
    { at: 29, type: 'horde', count: 16, hp: 6, spread: 290, mix: { walker: 2, runner: 1 } },

    { at: 33, type: 'banner', text: 'Wave 3' },
    { at: 34, type: 'gates', left: mul(2), right: add(9) },
    { at: 37, type: 'horde', count: 20, hp: 8, spread: 290, mix: { walker: 3, bloater: 1 } },
    { at: 40, type: 'crate', x: 250, hp: 240, upgrade: 'spread' },
    { at: 43, type: 'horde', count: 2, hp: 8, spread: 200, mix: { brute: 1 } },
    { at: 46, type: 'horde', count: 7, hp: 8, spread: 280, mix: { stalker: 1 } },
    { at: 50, type: 'gates', left: add(10), right: add(-6) },

    { at: 57, type: 'banner', text: 'BOSS' },
    { at: 58, type: 'boss', hp: 4500 },
    { at: 66, type: 'horde', count: 2, hp: 12, spread: 220, mix: { brute: 1 } },
  ],
};
