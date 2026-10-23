import { add, mul } from './gates';
import type { LevelDefinition } from './types';

/**
 * Level 5: "Ground Zero". About 75s of escalating pressure, then the boss.
 * A continuous stream keeps the road busy; scripted hordes and brutes spike it.
 * Things spawn just above the screen and take roughly 5-6s to reach the squad.
 */
export const level5: LevelDefinition = {
  id: 5,
  name: 'Ground Zero',
  blurb: 'Where it all started. Everything they have, all at once.',
  seed: 1337,
  stream: [
    { from: 2, to: 16, rate: [0.8, 1.6], hp: [2, 4], mix: { walker: 1 } },
    { from: 16, to: 30, rate: [1.4, 2.1], hp: [3, 5], mix: { walker: 3, runner: 1, stalker: 0.5 } },
    {
      from: 30,
      to: 47,
      rate: [2.1, 2.8],
      hp: [8, 12],
      mix: { walker: 3, runner: 2, stalker: 1, bloater: 0.6 },
    },
    {
      from: 47,
      to: 72,
      rate: [3.2, 4],
      hp: [10, 14],
      mix: { walker: 3, runner: 2, stalker: 1.5, bloater: 1 },
    },
    {
      from: 72,
      to: 200,
      rate: [2.6, 3.6],
      hp: [24, 32],
      mix: { walker: 3, runner: 2, bloater: 1 },
    },
  ],
  events: [
    { at: 0.5, type: 'banner', text: 'Wave 1' },
    { at: 1, type: 'gates', left: add(4), right: add(-2) },
    { at: 5, type: 'horde', count: 8, hp: 3, spread: 160 },
    { at: 7, type: 'crate', x: 180, hp: 30, upgrade: 'fireRate' },
    { at: 10, type: 'horde', count: 10, hp: 4, x: 120, spread: 180, mix: { walker: 3, runner: 1 } },
    { at: 12, type: 'gates', left: mul(2), right: add(5) },

    { at: 16, type: 'banner', text: 'Wave 2' },
    { at: 17, type: 'horde', count: 16, hp: 5, spread: 280, mix: { walker: 2, runner: 1 } },
    { at: 20, type: 'crate', x: 100, hp: 110, upgrade: 'damage' },
    { at: 22, type: 'horde', count: 2, hp: 5, x: 250, spread: 80, mix: { brute: 1 } },
    { at: 24, type: 'horde', count: 14, hp: 5, x: 250, spread: 140, mix: { runner: 1 } },
    { at: 26, type: 'gates', left: add(-6), right: add(-3) },
    { at: 27, type: 'horde', count: 5, hp: 5, spread: 260, mix: { stalker: 1 } },

    { at: 30, type: 'banner', text: 'Wave 3' },
    { at: 31, type: 'horde', count: 24, hp: 8, spread: 290, mix: { walker: 3, bloater: 1 } },
    { at: 34, type: 'crate', x: 250, hp: 320, upgrade: 'spread' },
    { at: 36, type: 'horde', count: 3, hp: 8, spread: 220, mix: { brute: 1 } },
    { at: 39, type: 'gates', left: mul(2), right: add(10) },
    {
      at: 42,
      type: 'horde',
      count: 28,
      hp: 16,
      spread: 290,
      mix: { walker: 2, runner: 2, bloater: 1 },
    },

    { at: 47, type: 'banner', text: 'Wave 4' },
    { at: 47, type: 'gates', left: add(-12), right: add(8) },
    {
      at: 51,
      type: 'horde',
      count: 34,
      hp: 20,
      spread: 290,
      mix: { walker: 3, runner: 2, bloater: 1 },
    },
    { at: 54, type: 'horde', count: 4, hp: 13, spread: 240, mix: { brute: 1 } },
    { at: 56, type: 'horde', count: 9, hp: 13, spread: 280, mix: { stalker: 1 } },
    { at: 57, type: 'crate', x: 180, hp: 800, upgrade: 'damage' },
    {
      at: 60,
      type: 'horde',
      count: 40,
      hp: 22,
      spread: 290,
      mix: { walker: 2, runner: 3, bloater: 1 },
    },
    { at: 63, type: 'horde', count: 5, hp: 14, spread: 260, mix: { brute: 1 } },
    { at: 66, type: 'gates', left: add(12), right: add(-10) },

    { at: 71, type: 'banner', text: 'BOSS' },
    { at: 72, type: 'boss', hp: 9000 },
    { at: 78, type: 'horde', count: 3, hp: 17, spread: 260, mix: { brute: 1 } },
    { at: 86, type: 'horde', count: 4, hp: 18, spread: 260, mix: { brute: 1 } },
  ],
};
