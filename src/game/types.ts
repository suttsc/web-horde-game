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

export type ZombieKind = 'walker' | 'brute';

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
  dead: boolean;
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
}

export interface Vec2 {
  x: number;
  y: number;
}
