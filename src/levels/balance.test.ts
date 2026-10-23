import { describe, expect, it } from 'vitest';
import { Game, type GameStats, type GameStatus } from '../game/Game';
import { applyGate } from '../game/gates';
import { ROAD_CENTER } from '../game/tuning';
import type { Zombie } from '../game/types';
import { LEVELS } from './index';
import type { LevelDefinition } from './types';

const STEP = 1 / 60;
const MAX_SECONDS = 200;

interface Outcome {
  status: GameStatus;
  stats: GameStats;
}

/**
 * Plays the level headlessly. The "skilled" bot takes the better gate, lines
 * up on crates, and otherwise aims at the nearest zombie; the idle one never moves.
 */
const playLevel = (level: LevelDefinition, skilled: boolean): Outcome => {
  let stats: GameStats = { kills: 0, peakUnits: 0, time: 0 };
  const game = new Game(level, { onStatus: (_, s) => (stats = { ...s }) });
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
      } else {
        // Line up on the closest zombie still in front of the squad.
        const threat = game.zombies
          .filter((z) => z.y < squad.y - 20)
          .reduce<Zombie | undefined>((best, z) => (!best || z.y > best.y ? z : best), undefined);
        if (threat) target = threat.x;
      }
    }
    game.update(STEP, (target - game.squad.x) * 0.1, 0);
  }
  return { status: game.status, stats };
};

describe.each(LEVELS.map((level) => [level.id, level] as const))(
  'level %i balance',
  (id, level) => {
    it('is beatable by a player who aims and picks gates and crates well', () => {
      expect(playLevel(level, true).status).toBe('won');
    });

    // Level 1 is the tutorial; from level 2 on, standing still must fail.
    it.skipIf(id < 2)('overruns a player who never moves', () => {
      expect(playLevel(level, false).status).toBe('lost');
    });

    it.skipIf(id < 3)('overruns a player who never moves early on', () => {
      expect(playLevel(level, false).stats.time).toBeLessThan(40);
    });
  },
);
