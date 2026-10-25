import { describe, expect, it } from 'vitest';
import { playLevel } from '../testing/bot';
import { LEVELS } from './index';

const RUNS = 12;

/** Minimum share of runs the skilled bot must win, per level id. */
const MIN_WIN_RATE: Record<number, number> = { 1: 0.9, 2: 0.8, 3: 0.7, 4: 0.6, 5: 0.5 };

const seeds = Array.from({ length: RUNS }, (_, i) => 1000 + i * 31);

describe.each(LEVELS.map((recipe) => [recipe.id, recipe] as const))(
  'level %i balance',
  (id, recipe) => {
    it('is usually beatable by a player who aims and picks well', { timeout: 120_000 }, () => {
      const wins = seeds.filter((seed) => playLevel(recipe, seed, true).status === 'won').length;
      expect(wins / RUNS).toBeGreaterThanOrEqual(MIN_WIN_RATE[id] ?? 0.5);
    });

    // Level 1 is the tutorial; from level 2 on, standing still should almost always fail.
    // Auto-targeting perks can occasionally carry an idle player, so allow a little slack.
    it.skipIf(id < 2)('overruns a player who never moves', { timeout: 120_000 }, () => {
      const losses = seeds.filter(
        (seed) => playLevel(recipe, seed, false).status === 'lost',
      ).length;
      expect(losses / RUNS).toBeGreaterThanOrEqual(0.8);
    });
  },
);
