import { beforeAll, describe, expect, it } from 'vitest';
import { playLevel, type Outcome } from '../testing/bot';
import { LEVELS } from './index';

const RUNS = 12;

/** Minimum share of runs the skilled bot must win, per level id. */
const MIN_WIN_RATE: Record<number, number> = { 1: 0.9, 2: 0.8, 3: 0.7, 4: 0.6, 5: 0.5 };

/** No run should snowball into a giant squad; gates and leaks keep it in check. */
const MAX_PEAK_UNITS = 160;

const seeds = Array.from({ length: RUNS }, (_, i) => 1000 + i * 31);

describe.each(LEVELS.map((recipe) => [recipe.id, recipe] as const))(
  'level %i balance',
  (id, recipe) => {
    let skilled: Outcome[] = [];
    let idle: Outcome[] = [];

    beforeAll(() => {
      skilled = seeds.map((seed) => playLevel(recipe, seed, true));
      idle = id < 2 ? [] : seeds.map((seed) => playLevel(recipe, seed, false));
    }, 180_000);

    it('is usually beatable by a player who aims and picks well', () => {
      const wins = skilled.filter((run) => run.status === 'won').length;
      expect(wins / RUNS).toBeGreaterThanOrEqual(MIN_WIN_RATE[id] ?? 0.5);
    });

    it('never lets the squad snowball', () => {
      const peak = Math.max(...skilled.map((run) => run.stats.peakUnits));
      expect(peak).toBeLessThanOrEqual(MAX_PEAK_UNITS);
    });

    // Level 1 is the tutorial; from level 2 on, standing still should almost always fail.
    // Auto-targeting perks can occasionally carry an idle player, so allow a little slack.
    it.skipIf(id < 2)('overruns a player who never moves', () => {
      const losses = idle.filter((run) => run.status === 'lost').length;
      expect(losses / RUNS).toBeGreaterThanOrEqual(0.8);
    });
  },
);
