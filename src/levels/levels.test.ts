import { describe, expect, it } from 'vitest';
import type { GameStats } from '../game/Game';
import { generateLevel } from './generate';
import { LEVELS, findLevel } from './index';
import { earnStars, starGoals } from './stars';

const SEEDS = Array.from({ length: 25 }, (_, i) => i * 7919 + 1);

describe('campaign', () => {
  it('numbers levels 1..n in order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(LEVELS.map((_, i) => i + 1));
    expect(findLevel(3)?.name).toBe(LEVELS[2]?.name);
  });

  it('gets longer and tougher towards the end', () => {
    const durations = LEVELS.map((l) => l.duration);
    const bossHp = LEVELS.map((l) => l.boss.hp);
    expect(durations).toEqual([...durations].sort((a, b) => a - b));
    expect(bossHp).toEqual([...bossHp].sort((a, b) => a - b));
  });
});

describe.each(LEVELS.map((recipe) => [recipe.id, recipe] as const))(
  'generated level %i',
  (_, recipe) => {
    const levels = SEEDS.map((seed) => generateLevel(recipe, seed));

    it('is the same for the same seed and differs between seeds', () => {
      expect(generateLevel(recipe, 42)).toEqual(generateLevel(recipe, 42));
      const layouts = new Set(levels.map((level) => JSON.stringify(level.events)));
      expect(layouts.size).toBe(SEEDS.length);
    });

    it('keeps events in chronological order with exactly one boss at the end', () => {
      for (const level of levels) {
        const times = level.events.map((e) => e.at);
        expect(times).toEqual([...times].sort((a, b) => a - b));
        const bosses = level.events.filter((e) => e.type === 'boss');
        expect(bosses).toHaveLength(1);
        expect(bosses[0]?.at).toBe(recipe.duration);
      }
    });

    it('offers an upgrade before every wave after the first and before the boss', () => {
      for (const level of levels) {
        expect(level.events.filter((e) => e.type === 'perk')).toHaveLength(recipe.waves);
      }
    });

    it('keeps crates on the road and gates meaningful', () => {
      for (const level of levels) {
        for (const event of level.events) {
          if (event.type === 'crate') {
            expect(event.x).toBeGreaterThan(60);
            expect(event.x).toBeLessThan(300);
          }
          if (event.type === 'gates') {
            for (const gate of [event.left, event.right]) {
              expect(Number.isInteger(gate.value)).toBe(true);
              expect(gate.value).not.toBe(0);
            }
          }
        }
      }
    });

    it('has a continuous, non-overlapping stream', () => {
      for (const level of levels) {
        level.stream.forEach((phase, i) => {
          expect(phase.to).toBeGreaterThan(phase.from);
          const next = level.stream[i + 1];
          if (next) expect(next.from).toBeGreaterThanOrEqual(phase.to);
        });
      }
    });

    it('only uses zombie kinds the recipe allows', () => {
      const allowed = new Set([...Object.keys(recipe.kinds), ...(recipe.brutes ? ['brute'] : [])]);
      for (const level of levels) {
        for (const event of level.events) {
          if (event.type !== 'horde') continue;
          for (const kind of Object.keys(event.mix ?? { walker: 1 })) {
            expect(allowed.has(kind)).toBe(true);
          }
        }
      }
    });
  },
);

describe('stars', () => {
  const recipe = LEVELS[0]!;
  const stats = (extra: Partial<GameStats>): GameStats => ({
    kills: 100,
    peakUnits: 50,
    time: 60,
    finalUnits: recipe.stars.units,
    badGates: 0,
    bossSeconds: 10,
    ...extra,
  });

  it('describes three goals', () => {
    expect(starGoals(recipe)).toHaveLength(3);
  });

  it('awards nothing for a loss', () => {
    expect(earnStars(recipe, stats({}), false)).toEqual([false, false, false]);
  });

  it('checks soldiers left and the challenge separately', () => {
    expect(earnStars(recipe, stats({}), true)).toEqual([true, true, true]);
    expect(earnStars(recipe, stats({ finalUnits: 1 }), true)).toEqual([true, false, true]);
    expect(earnStars(recipe, stats({ badGates: 1 }), true)).toEqual([true, true, false]);
  });
});
