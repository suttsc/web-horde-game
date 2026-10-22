import { describe, expect, it } from 'vitest';
import { Game, type GameStatus } from '../game/Game';
import { applyGate } from '../game/gates';
import { ROAD_CENTER } from '../game/tuning';
import { level1 } from './level1';

const STEP = 1 / 120;
const MAX_SECONDS = 200;

/** Plays the level headlessly with a simple bot and returns the outcome. */
const playLevel = (pickGates: boolean): GameStatus => {
  const game = new Game(level1);
  game.setViewHeight(700);
  game.start();

  for (let i = 0; i < MAX_SECONDS / STEP && game.status === 'playing'; i++) {
    let target = ROAD_CENTER;
    const pair = pickGates ? game.gates.find((g) => !g.passed) : undefined;
    if (pair) {
      const left = applyGate(game.squad.units, pair.left);
      const right = applyGate(game.squad.units, pair.right);
      target = left >= right ? 100 : 260;
    }
    game.update(STEP, (target - game.squad.x) * 0.05, 0);
  }
  return game.status;
};

describe('level 1 balance', () => {
  it('is beatable by a player who picks the better gate', () => {
    expect(playLevel(true)).toBe('won');
  });

  it('overruns a player who never moves', () => {
    expect(playLevel(false)).toBe('lost');
  });
});
