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
