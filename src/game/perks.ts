import type { Rng } from './rng';
import { PERK, UPGRADE_CAPS } from './tuning';

export type PerkId =
  | 'piercing'
  | 'incendiary'
  | 'medic'
  | 'grenadier'
  | 'overwatch'
  | 'scavenger'
  | 'armor'
  | 'drill'
  | 'hollowPoints'
  | 'reinforcements';

export type PerkStacks = Partial<Record<PerkId, number>>;

export interface PerkDefinition {
  id: PerkId;
  name: string;
  /** Short HUD tag. */
  tag: string;
  maxStacks: number;
  /** Description of what the next stack does. */
  describe: (nextStack: number) => string;
}

const percent = (value: number): string => `${Math.round(value * 100)}%`;

export const PERKS: Record<PerkId, PerkDefinition> = {
  piercing: {
    id: 'piercing',
    name: 'Piercing Rounds',
    tag: 'PRC',
    maxStacks: 3,
    describe: (n) => `Bullets pass through ${n * PERK.piercePerStack} zombie${n > 1 ? 's' : ''}.`,
  },
  incendiary: {
    id: 'incendiary',
    name: 'Incendiary',
    tag: 'INC',
    maxStacks: 2,
    describe: (n) =>
      n === 1 ? 'Kills leave burning ground that hurts zombies.' : 'Fires burn twice as hot.',
  },
  medic: {
    id: 'medic',
    name: 'Field Medic',
    tag: 'MED',
    maxStacks: 3,
    describe: (n) => `Gain a soldier every ${(PERK.medicInterval / n).toFixed(1)}s.`,
  },
  grenadier: {
    id: 'grenadier',
    name: 'Grenadier',
    tag: 'GRN',
    maxStacks: 3,
    describe: (n) =>
      n === 1
        ? 'Lob a grenade into the nearest crowd every few seconds.'
        : 'Throw grenades faster.',
  },
  overwatch: {
    id: 'overwatch',
    name: 'Overwatch',
    tag: 'SNP',
    maxStacks: 3,
    describe: (n) =>
      n === 1 ? 'A sniper picks off the toughest zombie on the road.' : 'The sniper fires faster.',
  },
  scavenger: {
    id: 'scavenger',
    name: 'Scavenger',
    tag: 'SCV',
    maxStacks: 1,
    describe: () => `Crates give double upgrades and +${PERK.scavengerBonusUnits} soldiers.`,
  },
  armor: {
    id: 'armor',
    name: 'Body Armor',
    tag: 'ARM',
    maxStacks: 2,
    describe: (n) => `${percent(n * PERK.armorChance)} chance to survive a zombie's hit.`,
  },
  drill: {
    id: 'drill',
    name: 'Drill Sergeant',
    tag: 'RATE',
    maxStacks: UPGRADE_CAPS.fireRate,
    describe: () => 'Faster fire rate.',
  },
  hollowPoints: {
    id: 'hollowPoints',
    name: 'Hollow Points',
    tag: 'DMG',
    maxStacks: UPGRADE_CAPS.damage,
    describe: () => 'More damage per bullet.',
  },
  reinforcements: {
    id: 'reinforcements',
    name: 'Reinforcements',
    tag: 'MEN',
    maxStacks: 99,
    describe: () => 'More soldiers join the squad right now.',
  },
};

/** Picks `count` distinct perks that can still be stacked. */
export const rollPerks = (stacks: PerkStacks, rng: Rng, count = 3): PerkId[] => {
  const pool = (Object.keys(PERKS) as PerkId[]).filter(
    (id) => (stacks[id] ?? 0) < PERKS[id].maxStacks,
  );
  const picks: PerkId[] = [];
  while (picks.length < count && pool.length > 0) {
    const index = Math.floor(rng() * pool.length);
    const [id] = pool.splice(index, 1);
    if (id) picks.push(id);
  }
  return picks;
};
