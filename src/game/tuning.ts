/**
 * Every gameplay number lives here so balancing is a one-file job.
 * Distances are in virtual pixels (world is 360 wide), times in seconds.
 */
export const WORLD_WIDTH = 360;
export const MIN_VIEW_HEIGHT = 560;
export const MAX_VIEW_HEIGHT = 820;

export const ROAD_LEFT = 28;
export const ROAD_RIGHT = 332;
export const ROAD_CENTER = (ROAD_LEFT + ROAD_RIGHT) / 2;

/** Speed the world (road, gates, crates) moves towards the squad. */
export const SCROLL_SPEED = 90;

export const SQUAD = {
  bottomOffset: 110,
  startUnits: 3,
  maxUnits: 999,
  /** Soldiers actually drawn; the rest are represented by the counter. */
  maxRendered: 40,
  /** Soldiers that physically shoot; damage scales so total firepower ≈ units. */
  maxShooters: 20,
  spacing: 8.5,
  unitRadius: 6,
  followSharpness: 20,
  dragSensitivity: 1.25,
  keyboardSpeed: 260,
} as const;

export const WEAPON = {
  baseInterval: 0.32,
  /** Each fire-rate level divides the interval by (1 + bonus * level). */
  fireRateBonus: 0.3,
  baseDamage: 1,
  damageBonus: 0.5,
  spreadAngle: 0.13,
  bulletSpeed: 560,
  bulletRadius: 3,
} as const;

export const UPGRADE_CAPS = {
  fireRate: 5,
  damage: 6,
  spread: 2,
} as const;

export const GATE = {
  height: 38,
  /** Full squad volleys needed to raise a +/- gate by one point. */
  volleysPerPoint: 10,
  /** Most a gate can be raised by shooting it, so gates can't be farmed. */
  maxRaise: 6,
  maxValue: 99,
} as const;

export const CRATE = {
  width: 66,
  height: 52,
  contactDamage: 5,
} as const;

export const ZOMBIE_KINDS = {
  /** Small, fast and fragile. */
  runner: { radius: 7, speed: 80, hp: 0.5, damage: 1 },
  walker: { radius: 10, speed: 30, hp: 1, damage: 1 },
  /** Lean and quick; darts across the road in sharp zigzags. */
  stalker: { radius: 8, speed: 62, hp: 0.9, damage: 1 },
  /** Swollen and slow; bursts on death, hurting nearby zombies. */
  bloater: { radius: 15, speed: 20, hp: 3.5, damage: 4 },
  /** Huge tank; survives contact and gets knocked back to come again. */
  brute: { radius: 21, speed: 17, hp: 10, damage: 6 },
} as const;

export const ZOMBIE = {
  /** Sideways px/s zombies drift towards the squad once within `homingRange`. */
  homing: 16,
  /** Vertical distance from the squad at which zombies start closing in. */
  homingRange: 180,
  /** Max px/s of each zombie's own random sideways wander. */
  wander: 16,
  /** How hard overlapping zombies push apart (0..1 per step). */
  separation: 0.35,
  stalkerDartSpeed: 165,
  stalkerDartTime: [0.22, 0.4],
  stalkerPauseTime: [0.06, 0.16],
  rowGap: 18,
  /** Random size multiplier; hp scales with size squared. */
  sizeJitter: [0.82, 1.25],
  bloaterBlastRadius: 60,
  bloaterBlastDamage: 0.6,
  bruteKnockback: 70,
  /**
   * A zombie that reaches the squad kills one soldier per this much of its
   * remaining hp (at least its kind's base damage), so leaks hurt more late on.
   */
  hpPerSoldier: 5,
  maxContactDamage: 12,
} as const;

/** Max blood pools kept on the road. */
export const MAX_DECALS = 90;

export const BOSS = {
  radius: 48,
  speed: 22,
  homing: 16,
} as const;

/**
 * Perk effects. Support damage is expressed in "volleys": one full squad
 * volley's worth of damage, so perks scale with squad size and upgrades.
 */
export const PERK = {
  piercePerStack: 1,
  incendiary: { radius: 22, duration: 2.5, volleyDps: 0.3 },
  medicInterval: 4,
  grenadier: { interval: 2.6, flightTime: 0.55, radius: 50, volleys: 1.3 },
  overwatch: { interval: 1.6, volleys: 1.6 },
  scavengerBonusUnits: 3,
  /** Soldiers granted by Reinforcements: base + perWave * wave number. */
  reinforcements: { base: 3, perWave: 2 },
  /** Chance per Body Armor stack to shrug off a contact. */
  armorChance: 0.25,
} as const;

export const JUICE = {
  maxTrauma: 1,
  traumaDecay: 1.6,
  maxShake: 9,
  bossSlowMo: 0.25,
  bossSlowMoDuration: 1.1,
  endDelay: 1.2,
} as const;
