import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';
import type { LevelDefinition } from './types';

/** Campaign order; each level unlocks the next. */
export const LEVELS: readonly LevelDefinition[] = [level1, level2, level3, level4, level5];

export const findLevel = (id: number): LevelDefinition | undefined =>
  LEVELS.find((level) => level.id === id);
