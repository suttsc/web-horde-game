import { add, mul } from './gates';
import type { LevelDefinition } from './types';

/** Level 4: "Redfield". Everything, just a little less of it than Ground Zero. */
export const level4: LevelDefinition = {
  id: 4,
  name: 'Redfield',
  blurb: 'The last town before the quarantine line. They are everywhere.',
  seed: 404,
  stream: [
    { from: 2, to: 16, rate: [0.8, 1.5], hp: [2, 4], mix: { walker: 3, runner: 1 } },
    {
      from: 16,
      to: 30,
      rate: [1.5, 2.2],
      hp: [3, 5],
      mix: { walker: 3, runner: 1, stalker: 0.6 },
    },
    {
      from: 30,
      to: 46,
      rate: [2.2, 2.8],
      hp: [7, 11],
      mix: { walker: 3, runner: 2, stalker: 1, bloater: 0.6 },
    },
    {
      from: 46,
      to: 200,
      rate: [2.8, 3.4],
      hp: [9, 13],
      mix: { walker: 3, runner: 2, stalker: 1.2, bloater: 1 },
    },
  ],
  events: [
    { at: 0.5, type: 'banner', text: 'Redfield' },
    { at: 1, type: 'gates', left: add(4), right: add(-2) },
    { at: 5, type: 'horde', count: 8, hp: 3, spread: 160 },
    { at: 7, type: 'crate', x: 180, hp: 30, upgrade: 'fireRate' },
    { at: 10, type: 'horde', count: 10, hp: 4, x: 120, spread: 180, mix: { walker: 3, runner: 1 } },
    { at: 12, type: 'gates', left: mul(2), right: add(5) },

    { at: 16, type: 'banner', text: 'Wave 2' },
    { at: 17, type: 'horde', count: 16, hp: 5, spread: 280, mix: { walker: 2, runner: 1 } },
    { at: 20, type: 'crate', x: 100, hp: 100, upgrade: 'damage' },
    { at: 22, type: 'horde', count: 2, hp: 5, x: 250, spread: 80, mix: { brute: 1 } },
    { at: 25, type: 'gates', left: add(-6), right: add(-3) },
    { at: 27, type: 'horde', count: 5, hp: 5, spread: 260, mix: { stalker: 1 } },

    { at: 30, type: 'banner', text: 'Wave 3' },
    { at: 31, type: 'horde', count: 22, hp: 8, spread: 290, mix: { walker: 3, bloater: 1 } },
    { at: 34, type: 'crate', x: 250, hp: 280, upgrade: 'spread' },
    { at: 36, type: 'horde', count: 3, hp: 8, spread: 220, mix: { brute: 1 } },
    { at: 39, type: 'gates', left: mul(2), right: add(10) },
    {
      at: 42,
      type: 'horde',
      count: 24,
      hp: 11,
      spread: 290,
      mix: { walker: 2, runner: 2, bloater: 1 },
    },

    { at: 46, type: 'banner', text: 'Wave 4' },
    { at: 47, type: 'gates', left: add(-8), right: add(8) },
    { at: 51, type: 'horde', count: 28, hp: 13, spread: 290, mix: { walker: 3, runner: 2 } },
    { at: 54, type: 'horde', count: 7, hp: 12, spread: 280, mix: { stalker: 1 } },
    { at: 57, type: 'horde', count: 3, hp: 12, spread: 240, mix: { brute: 1 } },
    { at: 60, type: 'gates', left: add(12), right: add(-8) },

    { at: 65, type: 'banner', text: 'BOSS' },
    { at: 66, type: 'boss', hp: 6500 },
    { at: 74, type: 'horde', count: 3, hp: 15, spread: 260, mix: { brute: 1 } },
  ],
};
