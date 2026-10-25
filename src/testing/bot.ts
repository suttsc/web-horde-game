import { Game, type GameStats, type GameStatus } from '../game/Game';
import { applyGate } from '../game/gates';
import type { PerkId } from '../game/perks';
import { ROAD_CENTER } from '../game/tuning';
import type { Zombie } from '../game/types';
import { generateLevel } from '../levels/generate';
import type { LevelRecipe } from '../levels/types';

const STEP = 1 / 60;
const MAX_SECONDS = 220;

/** A sensible but not optimal pick order for the bot. */
const PERK_PRIORITY: PerkId[] = [
  'hollowPoints',
  'piercing',
  'drill',
  'grenadier',
  'reinforcements',
  'overwatch',
  'medic',
  'incendiary',
  'armor',
  'scavenger',
];

export interface Outcome {
  status: GameStatus;
  stats: GameStats;
}

/**
 * Plays a generated level headlessly. The "skilled" bot takes the better gate,
 * lines up on crates, focuses the boss, and otherwise aims at the nearest
 * zombie; the idle one never moves. Both take perks by a fixed priority.
 */
export const playLevel = (recipe: LevelRecipe, seed: number, skilled: boolean): Outcome => {
  let stats: GameStats | null = null;
  const game = new Game(generateLevel(recipe, seed), {
    onStatus: (_, s) => (stats = { ...s }),
    onPerkChoice: (choices) => {
      const pick = PERK_PRIORITY.find((id) => choices.includes(id)) ?? choices[0];
      if (pick) game.choosePerk(pick);
    },
  });
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
      } else if (game.boss && !game.boss.dead) {
        target = game.boss.x;
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
  return { status: game.status, stats: stats ?? game.stats };
};
