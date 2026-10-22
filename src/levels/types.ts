import type { GateSpec, UpgradeKind, ZombieKind } from '../game/types';

export type LevelEvent =
  | { at: number; type: 'banner'; text: string }
  | { at: number; type: 'gates'; left: GateSpec; right: GateSpec }
  | { at: number; type: 'crate'; x: number; hp: number; upgrade: UpgradeKind; amount?: number }
  | {
      at: number;
      type: 'horde';
      count: number;
      hp: number;
      kind?: ZombieKind;
      /** Centre of the group; defaults to the road centre. */
      x?: number;
      /** Width the group is scattered across. */
      spread?: number;
    }
  | { at: number; type: 'boss'; hp: number };

export interface LevelDefinition {
  id: number;
  name: string;
  seed: number;
  events: LevelEvent[];
}
