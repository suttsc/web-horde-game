import { createRng, range, type Rng } from '../game/rng';
import { ROAD_CENTER } from '../game/tuning';
import type { GateSpec, UpgradeKind, ZombieKind } from '../game/types';
import { add, mul } from './gates';
import type { LevelDefinition, LevelEvent, LevelRecipe, StreamPhase, ZombieMix } from './types';

const CRATE_LANES = [100, 180, 260];
const CRATE_UPGRADES: UpgradeKind[] = ['fireRate', 'damage', 'spread'];

const lerp = ([from, to]: readonly [number, number], t: number): number => from + (to - from) * t;
const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;

/** Zombie kinds available at `progress` (0..1) through the level, with their weights. */
export const mixAt = (recipe: LevelRecipe, progress: number): ZombieMix => {
  const mix: ZombieMix = {};
  for (const [kind, entry] of Object.entries(recipe.kinds) as [
    ZombieKind,
    { from: number; weight: number },
  ][]) {
    if (progress >= entry.from) mix[kind] = entry.weight;
  }
  return Object.keys(mix).length > 0 ? mix : { walker: 1 };
};

/**
 * Builds a concrete level from a recipe. The same seed always yields the same
 * level, so runs are reproducible for tests while each new attempt differs.
 */
export const generateLevel = (recipe: LevelRecipe, seed: number): LevelDefinition => {
  const rng = createRng(seed);
  const events: LevelEvent[] = [];
  const stream: StreamPhase[] = [];
  const waveLength = recipe.duration / recipe.waves;
  let doublesOffered = 0;

  for (let wave = 0; wave < recipe.waves; wave++) {
    const start = wave * waveLength;
    const progress = recipe.waves > 1 ? wave / (recipe.waves - 1) : 0;
    const progressEnd = (wave + 1) / recipe.waves;

    if (wave > 0) events.push({ at: start, type: 'perk', wave: wave + 1 });
    events.push({
      at: start + 0.5,
      type: 'banner',
      text: wave === 0 ? recipe.name : `Wave ${wave + 1}`,
    });

    stream.push({
      from: Math.max(2, start),
      to: start + waveLength,
      rate: [lerp(recipe.stream.rate, progress * 0.9), lerp(recipe.stream.rate, progressEnd)],
      hp: [lerp(recipe.stream.hp, progress * 0.9), lerp(recipe.stream.hp, progressEnd)],
      mix: mixAt(recipe, progress),
    });

    // Two gate pairs per wave: an opener and a mid-wave choice.
    const [openLeft, openRight] = gatePair(rng, recipe, wave, progress, 'opener');
    events.push({ at: start + 1, type: 'gates', left: openLeft, right: openRight });
    // Guarantee one ×2 offer in the first half, so a run can't stall on bad rolls.
    const lastDoubleWave = recipe.waves > 1 ? (wave + 1) / (recipe.waves - 1) >= 0.5 : true;
    const role: GateRole =
      progress < 0.5 && doublesOffered === 0 && lastDoubleWave
        ? 'double'
        : wave > 0 && rng() < recipe.doubleRedChance
          ? 'doubleRed'
          : 'choice';
    const [midLeft, midRight] = gatePair(rng, recipe, wave, progress, role);
    if (midLeft.op === 'mul' || midRight.op === 'mul') doublesOffered++;
    events.push({
      at: start + waveLength * range(rng, 0.5, 0.62),
      type: 'gates',
      left: midLeft,
      right: midRight,
    });

    // One crate per wave; the first is always fire rate so early runs ramp up,
    // later ones sometimes hold reinforcements instead of a weapon upgrade.
    const reinforcements = wave > 0 && rng() < 0.25;
    events.push({
      at: start + waveLength * range(rng, 0.25, 0.38),
      type: 'crate',
      x: pick(rng, CRATE_LANES),
      hp: Math.round(lerp(recipe.crates.hp, progress) * range(rng, 0.85, 1.15)),
      upgrade: wave === 0 ? 'fireRate' : reinforcements ? 'units' : pick(rng, CRATE_UPGRADES),
      amount: reinforcements ? 3 + wave * 2 : 1,
    });

    for (let i = 0; i < recipe.hordes.perWave; i++) {
      const at = start + waveLength * ((i + range(rng, 0.25, 0.85)) / recipe.hordes.perWave);
      events.push(horde(rng, recipe, at, progress));
    }

    if (recipe.brutes && progress >= recipe.brutes.from) {
      events.push({
        at: start + waveLength * range(rng, 0.4, 0.8),
        type: 'horde',
        count: Math.round(range(rng, ...recipe.brutes.count)),
        hp: lerp(recipe.hordes.hp, progress),
        spread: range(rng, 140, 260),
        x: ROAD_CENTER + range(rng, -40, 40),
        mix: { brute: 1 },
      });
    }
  }

  const bossAt = recipe.duration;
  events.push({ at: bossAt - 2, type: 'perk', wave: recipe.waves + 1 });
  events.push({ at: bossAt - 1, type: 'banner', text: 'BOSS' });
  events.push({ at: bossAt, type: 'boss', hp: recipe.boss.hp });
  if (recipe.brutes) {
    for (const delay of [7, 15]) {
      events.push({
        at: bossAt + delay,
        type: 'horde',
        count: Math.round(recipe.brutes.count[1]),
        hp: lerp(recipe.hordes.hp, 1) * 1.2,
        spread: 240,
        mix: { brute: 1 },
      });
    }
  }
  stream.push({
    from: bossAt,
    to: 400,
    rate: [lerp(recipe.stream.rate, 1) * 0.8, lerp(recipe.stream.rate, 1) * 0.9],
    hp: [lerp(recipe.stream.hp, 1) * 1.3, lerp(recipe.stream.hp, 1) * 1.5],
    mix: mixAt(recipe, 1),
  });

  // Stable sort keeps same-time events in authoring order (perk before banner).
  events.sort((a, b) => a.at - b.at);

  return { id: recipe.id, name: recipe.name, blurb: recipe.blurb, seed, stream, events };
};

const horde = (rng: Rng, recipe: LevelRecipe, at: number, progress: number): LevelEvent => {
  const mix = mixAt(recipe, progress);
  const specials = (Object.keys(mix) as ZombieKind[]).filter((k) => k !== 'walker');
  const size = lerp(recipe.hordes.size, progress) * range(rng, 0.8, 1.2);
  const hp = lerp(recipe.hordes.hp, progress);

  // Sometimes a tight pack of one special kind instead of a mixed crowd.
  if (specials.length > 0 && rng() < 0.3) {
    return {
      at,
      type: 'horde',
      count: Math.max(3, Math.round(size * 0.35)),
      hp,
      x: ROAD_CENTER + range(rng, -70, 70),
      spread: range(rng, 140, 240),
      mix: { [pick(rng, specials)]: 1 },
    };
  }
  return {
    at,
    type: 'horde',
    count: Math.max(3, Math.round(size)),
    hp,
    x: ROAD_CENTER + range(rng, -60, 60),
    spread: range(rng, 180, 290),
    mix,
  };
};

type GateRole = 'opener' | 'choice' | 'double' | 'doubleRed';

/**
 * A pair of gates with one clearly better side, randomly placed. Openers are
 * small additive choices; the mid-wave pair may offer a ×2. Values grow
 * through the level; `doubleRed` makes both negative so the player has to
 * shoot one positive.
 */
const gatePair = (
  rng: Rng,
  recipe: LevelRecipe,
  wave: number,
  progress: number,
  role: GateRole,
): [GateSpec, GateSpec] => {
  const scale = recipe.gateScale * (1 + progress);
  const amount = (min: number, max: number): number =>
    Math.max(1, Math.round(range(rng, min, max) * scale));

  let pair: [GateSpec, GateSpec];
  if (role === 'doubleRed') {
    pair = [add(-amount(2, 4)), add(-amount(1, 3))];
  } else if (role === 'opener') {
    pair =
      wave === 0
        ? [add(amount(3, 5)), add(-amount(1, 3))]
        : [add(amount(2, 5)), add(-amount(2, 5))];
  } else {
    // ×2 only early, while it doubles a small squad; late on it would snowball.
    const good = role === 'double' || (progress < 0.5 && rng() < 0.45) ? mul(2) : add(amount(4, 7));
    const other = rng() < 0.6 ? add(-amount(2, 5)) : add(amount(1, 3));
    pair = [good, other];
  }
  return rng() < 0.5 ? pair : [pair[1], pair[0]];
};
