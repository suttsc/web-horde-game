import { CAMPAIGN } from './campaign';
import type { LevelRecipe } from './types';

/** Campaign order; each level unlocks the next. */
export const LEVELS: readonly LevelRecipe[] = CAMPAIGN;

export const findLevel = (id: number): LevelRecipe | undefined =>
  LEVELS.find((level) => level.id === id);

/** A fresh seed for each attempt, so no two runs are the same. */
export const randomSeed = (): number => Math.floor(Math.random() * 2 ** 31);
