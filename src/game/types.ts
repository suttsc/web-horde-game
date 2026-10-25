export type GateOp = 'add' | 'mul';

export interface GateSpec {
  op: GateOp;
  value: number;
}

export interface Gate extends GateSpec {
  left: number;
  right: number;
  /** Fractional progress towards the next +1 from being shot. */
  charge: number;
  flash: number;
}

export interface GatePair {
  /** Unique per run, so a bullet charges each pair only once as it passes through. */
  id: number;
  y: number;
  left: Gate;
  right: Gate;
  passed: boolean;
}

export type UpgradeKind = 'fireRate' | 'damage' | 'spread' | 'units';

export interface Crate {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  upgrade: UpgradeKind;
  amount: number;
  flash: number;
  dead: boolean;
}

export type ZombieKind = 'runner' | 'walker' | 'stalker' | 'bloater' | 'brute';

export interface Zombie {
  kind: ZombieKind;
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  phase: number;
  flash: number;
  /** Clothing colour, picked at spawn for variety. */
  shirt: string;
  /** Personal sideways wander in px/s, so the horde doesn't move in lockstep. */
  drift: number;
  /** Stalker dart state: time left in the current dash/pause, and direction. */
  dartTimer: number;
  dartDir: number;
  dashing: boolean;
  dead: boolean;
}

export interface Boss {
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  phase: number;
  flash: number;
  dead: boolean;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  /** Zombies this bullet can still pass through (Piercing perk). */
  pierce: number;
  /** Last zombie hit, so a piercing bullet doesn't hit it twice. */
  lastHit: Zombie | null;
  /** Id of the last gate pair charged. */
  lastGate: number;
  dead: boolean;
}

/** Lobbed by the Grenadier perk; explodes on landing. */
export interface Grenade {
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  /** 0..1 flight progress. */
  t: number;
  damage: number;
}

/** Burning ground left by Incendiary kills. */
export interface FirePatch {
  x: number;
  y: number;
  r: number;
  life: number;
  maxLife: number;
  dps: number;
}

/** Visual-only tracer for the Overwatch sniper. */
export interface Tracer {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
}

export interface Squad {
  x: number;
  targetX: number;
  y: number;
  units: number;
  fireTimer: number;
  fireRateLevel: number;
  damageLevel: number;
  spreadLevel: number;
  flash: number;
  /** Seconds left on the muzzle-flash sprite. */
  muzzle: number;
}

/** Persistent ground stain (blood, bile) that scrolls with the road. */
export interface Decal {
  x: number;
  y: number;
  color: string;
  /** Irregular outline as radii around the centre. */
  shape: number[];
  rotation: number;
}

export interface Vec2 {
  x: number;
  y: number;
}
