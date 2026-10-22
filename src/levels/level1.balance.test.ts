import { describe, expect, it } from 'vitest';
import { Game, type GameStats, type GameStatus } from '../game/Game';
import { applyGate } from '../game/gates';
import { ROAD_CENTER } from '../game/tuning';
import { level1 } from './level1';

const STEP = 1 / 60;
const MAX_SECONDS = 200;

interface Outcome {
  status: GameStatus;
  stats: GameStats;
}

/**
 * Plays the level headlessly. The "skilled" bot takes the better gate and
 * lines up on crates in between; the idle one never moves.
 */
const playLevel = (skilled: boolean): Outcome => {
  let stats: GameStats = { kills: 0, peakUnits: 0, time: 0 };
  const game = new Game(level1, { onStatus: (_, s) => (stats = { ...s }) });
  game.setViewHeight(700);
  game.start();

  for (let i = 0; i < MAX_SECONDS / STEP && game.status === 'playing'; i++) {
    let target = ROAD_CENTER;
    if (skilled) {
      const squad = game.squad;
      const pair = game.gates.find((g) => !g.passed && g.y > squad.y - 260);
      const crate = game.crates.find((c) => c.y < squad.y - 60);
      if (pair) {
        const left = applyGate(squad.units, pair.left);
        const right = applyGate(squad.units, pair.right);
        target = left >= right ? 100 : 260;
      } else if (crate) {
        target = crate.x;
      }
    }
    game.update(STEP, (target - game.squad.x) * 0.1, 0);
  }
  return { status: game.status, stats };
};

describe('level 1 balance', () => {
  it('is beatable by a player who picks gates and crates well', () => {
    expect(playLevel(true).status).toBe('won');
  });

  it('overruns a player who never moves early on', () => {
    const { status, stats } = playLevel(false);
    expect(status).toBe('lost');
    expect(stats.time).toBeLessThan(30);
  });
});
