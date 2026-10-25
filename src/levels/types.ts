import type { GateSpec, UpgradeKind, ZombieKind } from '../game/types';

export type LevelEvent =
  | { at: number; type: 'banner'; text: string }
  | { at: number; type: 'gates'; left: GateSpec; right: GateSpec }
  | { at: number; type: 'crate'; x: number; hp: number; upgrade: UpgradeKind; amount?: number }
  | {
      at: number;
      type: 'horde';
      count: number;
      /** Base hp of a walker; other kinds scale from it. */
      hp: number;
      /** Relative spawn weights per kind; defaults to walkers only. */
      mix?: ZombieMix;
      /** Centre of the group; defaults to the road centre. */
      x?: number;
      /** Width the group is scattered across. */
      spread?: number;
    }
  /** Pause for an upgrade pick; `wave` is the wave about to start. */
  | { at: number; type: 'perk'; wave: number }
  | { at: number; type: 'boss'; hp: number };

export type ZombieMix = Partial<Record<ZombieKind, number>>;

/**
 * Continuous trickle of zombies between `from` and `to`, ramping linearly
 * from the first to the second value of `rate` (zombies/s) and `hp`.
 */
export interface StreamPhase {
  from: number;
  to: number;
  rate: [number, number];
  hp: [number, number];
  mix: ZombieMix;
}

export interface LevelDefinition {
  id: number;
  /** Town name shown on the map. */
  name: string;
  /** One-line briefing shown on the map. */
  blurb: string;
  seed: number;
  stream: StreamPhase[];
  events: LevelEvent[];
}

/** A level's third star: a specific challenge on top of clearing it with enough soldiers. */
export type StarChallenge =
  { type: 'noBadGates' } | { type: 'bossTime'; seconds: number } | { type: 'kills'; count: number };

/**
 * What a level is made of. `generateLevel` turns a recipe plus a seed into a
 * concrete LevelDefinition, so every attempt plays out differently.
 * `[start, end]` pairs ramp linearly from the first wave to the last.
 */
export interface LevelRecipe {
  id: number;
  name: string;
  blurb: string;
  /** Seconds until the boss arrives. */
  duration: number;
  waves: number;
  stream: { rate: [number, number]; hp: [number, number] };
  hordes: { perWave: number; size: [number, number]; hp: [number, number] };
  /** Zombie kinds and when (0..1 through the level) they start appearing. */
  kinds: Partial<Record<ZombieKind, { from: number; weight: number }>>;
  brutes?: { from: number; count: [number, number] };
  crates: { hp: [number, number] };
  /** Chance a wave's second gate pair is two red gates you must shoot up. */
  doubleRedChance: number;
  /** Scales gate values; bigger levels need bigger numbers. */
  gateScale: number;
  boss: { hp: number };
  stars: { units: number; challenge: StarChallenge };
}
