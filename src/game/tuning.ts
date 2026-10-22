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
  volleysPerPoint: 4,
  maxValue: 99,
} as const;

export const CRATE = {
  width: 66,
  height: 52,
  contactDamage: 5,
} as const;

export const ZOMBIE = {
  walker: { radius: 9, speed: 32, damage: 1 },
  brute: { radius: 15, speed: 20, damage: 4 },
  /** Sideways px/s zombies drift towards the squad. */
  homing: 22,
  rowGap: 20,
} as const;

export const BOSS = {
  radius: 44,
  speed: 24,
  homing: 16,
} as const;

export const JUICE = {
  maxTrauma: 1,
  traumaDecay: 1.6,
  maxShake: 9,
  bossSlowMo: 0.25,
  bossSlowMoDuration: 1.1,
  endDelay: 1.2,
} as const;
