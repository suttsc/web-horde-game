import { add, mul } from './gates';
import type { LevelDefinition } from './types';

/** Level 2: "Millbrook". Runners join in; first bloaters late on. */
export const level2: LevelDefinition = {
  id: 2,
  name: 'Millbrook',
  blurb: 'Farm country. Some of these ones can run.',
  seed: 202,
  stream: [
    { from: 2, to: 18, rate: [0.7, 1.3], hp: [2, 4], mix: { walker: 3, runner: 1 } },
    { from: 18, to: 36, rate: [1.3, 2], hp: [3, 6], mix: { walker: 3, runner: 1.5 } },
    {
      from: 36,
      to: 200,
      rate: [2, 2.4],
      hp: [6, 9],
      mix: { walker: 3, runner: 2, bloater: 0.4 },
    },
  ],
  events: [
    { at: 0.5, type: 'banner', text: 'Millbrook' },
    { at: 1, type: 'gates', left: add(4), right: add(-2) },
    { at: 5, type: 'horde', count: 7, hp: 3, spread: 180 },
    { at: 7, type: 'crate', x: 180, hp: 25, upgrade: 'fireRate' },
    { at: 10, type: 'horde', count: 8, hp: 3, x: 250, spread: 120, mix: { runner: 1 } },
    { at: 12, type: 'gates', left: mul(2), right: add(5) },

    { at: 17, type: 'banner', text: 'Wave 2' },
    { at: 18, type: 'horde', count: 14, hp: 5, spread: 280, mix: { walker: 2, runner: 1 } },
    { at: 21, type: 'crate', x: 100, hp: 80, upgrade: 'damage' },
    { at: 25, type: 'gates', left: add(-4), right: add(7) },
    { at: 29, type: 'horde', count: 12, hp: 5, x: 110, spread: 140, mix: { runner: 1 } },
    { at: 33, type: 'gates', left: add(10), right: mul(2) },

    { at: 36, type: 'banner', text: 'Wave 3' },
    { at: 37, type: 'horde', count: 18, hp: 7, spread: 290, mix: { walker: 3, bloater: 1 } },
    { at: 41, type: 'crate', x: 250, hp: 180, upgrade: 'spread' },
    { at: 45, type: 'horde', count: 20, hp: 8, spread: 290, mix: { walker: 2, runner: 2 } },

    { at: 51, type: 'banner', text: 'BOSS' },
    { at: 52, type: 'boss', hp: 3000 },
  ],
};
