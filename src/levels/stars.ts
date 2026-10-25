import type { GameStats } from '../game/Game';
import type { LevelRecipe, StarChallenge } from './types';

export type StarResult = [boolean, boolean, boolean];

const describeChallenge = (challenge: StarChallenge): string => {
  switch (challenge.type) {
    case 'noBadGates':
      return 'Never take a red gate';
    case 'bossTime':
      return `Kill the boss within ${challenge.seconds}s`;
    case 'kills':
      return `Kill ${challenge.count} zombies`;
  }
};

const meetsChallenge = (challenge: StarChallenge, stats: GameStats): boolean => {
  switch (challenge.type) {
    case 'noBadGates':
      return stats.badGates === 0;
    case 'bossTime':
      return stats.bossSeconds !== null && stats.bossSeconds <= challenge.seconds;
    case 'kills':
      return stats.kills >= challenge.count;
  }
};

/** The three goals for a level, in star order. */
export const starGoals = (recipe: LevelRecipe): [string, string, string] => [
  'Clear the town',
  `Finish with ${recipe.stars.units}+ soldiers`,
  describeChallenge(recipe.stars.challenge),
];

/** Stars earned by a run; nothing counts unless the town was cleared. */
export const earnStars = (recipe: LevelRecipe, stats: GameStats, won: boolean): StarResult =>
  won
    ? [true, stats.finalUnits >= recipe.stars.units, meetsChallenge(recipe.stars.challenge, stats)]
    : [false, false, false];
