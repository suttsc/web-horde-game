import type { LevelDefinition, LevelEvent, StreamPhase, ZombieMix } from '../levels/types';
import { formationOffsets, formationRadius } from './formation';
import { applyGate, chargeGate, gateLabel, isBeneficial } from './gates';
import { Juice } from './juice';
import { circleRectOverlap, circlesOverlap, clamp, damp } from './math';
import { PALETTE } from './palette';
import { createRng, range, type Rng } from './rng';
import {
  BOSS,
  CRATE,
  GATE,
  JUICE,
  MAX_DECALS,
  MAX_VIEW_HEIGHT,
  MIN_VIEW_HEIGHT,
  ROAD_CENTER,
  ROAD_LEFT,
  ROAD_RIGHT,
  SCROLL_SPEED,
  SQUAD,
  UPGRADE_CAPS,
  WEAPON,
  ZOMBIE,
  ZOMBIE_KINDS,
} from './tuning';
import type {
  Boss,
  Bullet,
  Crate,
  Decal,
  Gate,
  GatePair,
  GateSpec,
  Squad,
  UpgradeKind,
  Vec2,
  Zombie,
  ZombieKind,
} from './types';

export type GameStatus = 'menu' | 'playing' | 'won' | 'lost';

export interface GameStats {
  kills: number;
  peakUnits: number;
  time: number;
}

export interface GameListeners {
  onStatus?: (status: GameStatus, stats: GameStats) => void;
  onBanner?: (text: string) => void;
}

const UPGRADE_LABELS: Record<UpgradeKind, string> = {
  fireRate: 'FIRE RATE UP',
  damage: 'DAMAGE UP',
  spread: 'SPREAD SHOT',
  units: 'REINFORCEMENTS',
};

export class Game {
  status: GameStatus = 'menu';
  viewHeight = 640;
  elapsed = 0;
  /** Distance the road has scrolled; drives background animation. */
  scroll = 0;

  squad!: Squad;
  bullets: Bullet[] = [];
  zombies: Zombie[] = [];
  crates: Crate[] = [];
  gates: GatePair[] = [];
  boss: Boss | null = null;
  decals: Decal[] = [];
  stats: GameStats = { kills: 0, peakUnits: 0, time: 0 };

  juice: Juice;
  formation: Vec2[] = [];

  private rng: Rng;
  private eventIndex = 0;
  /** Fractional zombies owed by the continuous stream. */
  private streamDebt = 0;
  private slowMo = 0;
  private endTimer = 0;
  private pendingStatus: GameStatus | null = null;
  private readonly bossAt: number;

  constructor(
    private readonly level: LevelDefinition,
    private readonly listeners: GameListeners = {},
  ) {
    this.rng = createRng(level.seed);
    this.juice = new Juice(this.rng);
    this.bossAt = level.events.find((e) => e.type === 'boss')?.at ?? 60;
    this.reset();
  }

  get squadRadius(): number {
    return formationRadius(this.renderedUnits, SQUAD.spacing, SQUAD.unitRadius);
  }

  get renderedUnits(): number {
    return Math.min(this.squad.units, SQUAD.maxRendered);
  }

  /** 0..1 progress towards the boss; once the boss is up, its remaining health. */
  get progress(): number {
    if (this.boss) return 1;
    return clamp(this.elapsed / this.bossAt, 0, 1);
  }

  setViewHeight(height: number): void {
    this.viewHeight = clamp(height, MIN_VIEW_HEIGHT, MAX_VIEW_HEIGHT);
    if (this.squad) this.squad.y = this.viewHeight - SQUAD.bottomOffset;
  }

  start(): void {
    this.reset();
    this.setStatus('playing');
  }

  reset(): void {
    this.rng = createRng(this.level.seed);
    this.juice = new Juice(this.rng);
    this.squad = {
      x: ROAD_CENTER,
      targetX: ROAD_CENTER,
      y: this.viewHeight - SQUAD.bottomOffset,
      units: SQUAD.startUnits,
      fireTimer: 0,
      fireRateLevel: 0,
      damageLevel: 0,
      spreadLevel: 0,
      flash: 0,
      muzzle: 0,
    };
    this.formation = formationOffsets(SQUAD.maxRendered, SQUAD.spacing);
    this.bullets = [];
    this.zombies = [];
    this.crates = [];
    this.gates = [];
    this.boss = null;
    this.decals = [];
    this.elapsed = 0;
    this.eventIndex = 0;
    this.streamDebt = 0;
    this.slowMo = 0;
    this.endTimer = 0;
    this.pendingStatus = null;
    this.stats = { kills: 0, peakUnits: SQUAD.startUnits, time: 0 };
  }

  /** Advance the simulation. `steer` is drag distance, `keyAxis` is -1..1. */
  update(rawDt: number, steer: number, keyAxis: number): void {
    const dt = rawDt * (this.slowMo > 0 ? JUICE.bossSlowMo : 1);
    this.slowMo = Math.max(0, this.slowMo - rawDt);
    this.juice.update(dt);

    if (this.status !== 'playing') return;

    this.scroll += SCROLL_SPEED * dt;
    this.elapsed += dt;

    this.runTimeline();
    this.runStream(dt);
    this.updateDecals(dt);
    this.updateSquad(dt, steer, keyAxis);
    this.updateBullets(dt);
    this.updateGates(dt);
    this.updateCrates(dt);
    this.updateZombies(dt);
    this.updateBoss(dt);
    this.resolveBulletHits();
    this.cleanup();

    if (this.pendingStatus) {
      this.endTimer -= rawDt;
      if (this.endTimer <= 0) this.setStatus(this.pendingStatus);
    }
  }

  private setStatus(status: GameStatus): void {
    this.status = status;
    this.stats.time = this.elapsed;
    this.listeners.onStatus?.(status, this.stats);
  }

  private finish(status: 'won' | 'lost'): void {
    if (this.pendingStatus) return;
    this.pendingStatus = status;
    this.endTimer = JUICE.endDelay;
  }

  // --- Timeline -------------------------------------------------------------

  private runTimeline(): void {
    const events = this.level.events;
    while (this.eventIndex < events.length) {
      const event = events[this.eventIndex];
      if (!event || event.at > this.elapsed) break;
      this.spawn(event);
      this.eventIndex++;
    }
  }

  private spawn(event: LevelEvent): void {
    switch (event.type) {
      case 'banner':
        this.listeners.onBanner?.(event.text);
        break;
      case 'gates':
        this.gates.push(this.createGatePair(event.left, event.right));
        break;
      case 'crate':
        this.crates.push({
          x: event.x,
          y: -CRATE.height,
          hp: event.hp,
          maxHp: event.hp,
          upgrade: event.upgrade,
          amount: event.amount ?? 1,
          flash: 0,
          dead: false,
        });
        break;
      case 'horde':
        this.spawnHorde(event.count, event.hp, event.mix ?? { walker: 1 }, event.x, event.spread);
        break;
      case 'boss':
        this.boss = {
          x: ROAD_CENTER,
          y: -BOSS.radius * 1.5,
          r: BOSS.radius,
          hp: event.hp,
          maxHp: event.hp,
          phase: 0,
          flash: 0,
          dead: false,
        };
        this.juice.shake(0.5);
        break;
    }
  }

  private createGatePair(left: GateSpec, right: GateSpec): GatePair {
    const gate = (spec: GateSpec, from: number, to: number): Gate => ({
      ...spec,
      left: from,
      right: to,
      charge: 0,
      flash: 0,
    });
    return {
      y: -GATE.height,
      left: gate(left, ROAD_LEFT, ROAD_CENTER),
      right: gate(right, ROAD_CENTER, ROAD_RIGHT),
      passed: false,
    };
  }

  private spawnHorde(
    count: number,
    hp: number,
    mix: ZombieMix,
    x = ROAD_CENTER,
    spread = 200,
  ): void {
    const perRow = Math.max(1, Math.floor(spread / 26));
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / perRow);
      const y = -12 - row * ZOMBIE.rowGap - this.rng() * 14;
      this.spawnZombie(this.pickKind(mix), hp, x + range(this.rng, -spread / 2, spread / 2), y);
    }
  }

  /** Continuous trickle so the road is never empty. */
  private runStream(dt: number): void {
    const phase = this.level.stream.find((p) => this.elapsed >= p.from && this.elapsed < p.to);
    if (!phase || this.pendingStatus) return;

    const t = (this.elapsed - phase.from) / (phase.to - phase.from);
    this.streamDebt += rampValue(phase.rate, t) * dt;
    while (this.streamDebt >= 1) {
      this.streamDebt -= 1;
      const x = range(this.rng, ROAD_LEFT, ROAD_RIGHT);
      this.spawnZombie(this.pickKind(phase.mix), rampValue(phase.hp, t), x, -14);
    }
  }

  private pickKind(mix: ZombieMix): ZombieKind {
    const entries = Object.entries(mix) as [ZombieKind, number][];
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = this.rng() * total;
    for (const [kind, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return kind;
    }
    return entries[0]?.[0] ?? 'walker';
  }

  private spawnZombie(kind: ZombieKind, baseHp: number, x: number, y: number): void {
    const stats = ZOMBIE_KINDS[kind];
    const size = range(this.rng, ZOMBIE.sizeJitter[0], ZOMBIE.sizeJitter[1]);
    const r = stats.radius * size;
    const hp = baseHp * stats.hp * size * size;
    const shirts = PALETTE.shirts;
    this.zombies.push({
      kind,
      x: clamp(x, ROAD_LEFT + r, ROAD_RIGHT - r),
      y: y - r,
      r,
      hp,
      maxHp: hp,
      speed: stats.speed * range(this.rng, 0.85, 1.15),
      damage: stats.damage,
      phase: this.rng() * Math.PI * 2,
      flash: 0,
      shirt: shirts[Math.floor(this.rng() * shirts.length)] ?? shirts[0],
      dead: false,
    });
  }

  private addDecal(x: number, y: number, radius: number, color: string): void {
    const points = 12;
    this.decals.push({
      x,
      y,
      color,
      rotation: this.rng() * Math.PI * 2,
      shape: Array.from({ length: points }, () => radius * range(this.rng, 0.55, 1.15)),
    });
    if (this.decals.length > MAX_DECALS) this.decals.shift();
  }

  private updateDecals(dt: number): void {
    for (const decal of this.decals) decal.y += SCROLL_SPEED * dt;
    if (this.decals[0] && this.decals[0].y > this.viewHeight + 60) {
      this.decals = this.decals.filter((d) => d.y < this.viewHeight + 60);
    }
  }

  // --- Squad ----------------------------------------------------------------

  private updateSquad(dt: number, steer: number, keyAxis: number): void {
    const squad = this.squad;
    const margin = Math.min(this.squadRadius, 60);

    squad.targetX += steer * SQUAD.dragSensitivity + keyAxis * SQUAD.keyboardSpeed * dt;
    squad.targetX = clamp(squad.targetX, ROAD_LEFT + margin, ROAD_RIGHT - margin);
    squad.x += (squad.targetX - squad.x) * damp(SQUAD.followSharpness, dt);
    squad.flash = Math.max(0, squad.flash - dt);
    squad.muzzle = Math.max(0, squad.muzzle - dt);

    if (squad.units <= 0) return;

    squad.fireTimer -= dt;
    if (squad.fireTimer <= 0) {
      squad.fireTimer += WEAPON.baseInterval / (1 + WEAPON.fireRateBonus * squad.fireRateLevel);
      this.fireVolley();
    }
  }

  private fireVolley(): void {
    const squad = this.squad;
    const shooters = Math.min(squad.units, SQUAD.maxShooters);
    const damage =
      (WEAPON.baseDamage * (1 + WEAPON.damageBonus * squad.damageLevel) * squad.units) / shooters;
    squad.muzzle = 0.05;
    this.juice.casing(squad.x + range(this.rng, -6, 6), squad.y, PALETTE.brass);

    for (let i = 0; i < shooters; i++) {
      const offset = this.formation[i];
      if (!offset) continue;
      const x = squad.x + offset.x;
      const y = squad.y + offset.y - SQUAD.unitRadius;
      for (let s = -squad.spreadLevel; s <= squad.spreadLevel; s++) {
        const angle = s * WEAPON.spreadAngle;
        this.bullets.push({
          x,
          y,
          vx: Math.sin(angle) * WEAPON.bulletSpeed,
          vy: -Math.cos(angle) * WEAPON.bulletSpeed,
          damage,
          dead: false,
        });
      }
    }
  }

  private loseUnits(amount: number, x: number, y: number): void {
    const squad = this.squad;
    squad.units = Math.max(0, squad.units - amount);
    squad.flash = 0.15;
    this.juice.burst(x, y, PALETTE.soldier, 4 + amount * 2, 140);
    this.juice.burst(x, y, PALETTE.blood, 6 + amount * 2, 120);
    if (amount > 0) this.addDecal(x, y, 6 + Math.min(amount, 8) * 2, PALETTE.blood);
    this.juice.shake(0.25 + Math.min(amount, 10) * 0.04);
    if (squad.units <= 0) {
      this.juice.burst(squad.x, squad.y, PALETTE.soldier, 30, 220, 4);
      this.juice.shake(1);
      this.finish('lost');
    }
  }

  private setUnits(units: number): void {
    this.squad.units = units;
    this.stats.peakUnits = Math.max(this.stats.peakUnits, units);
  }

  // --- World objects ----------------------------------------------------------

  private updateBullets(dt: number): void {
    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.y < -20 || bullet.x < 0 || bullet.x > 360) bullet.dead = true;
    }
  }

  private updateGates(dt: number): void {
    const squad = this.squad;
    for (const pair of this.gates) {
      pair.y += SCROLL_SPEED * dt;
      pair.left.flash = Math.max(0, pair.left.flash - dt);
      pair.right.flash = Math.max(0, pair.right.flash - dt);

      if (pair.passed || pair.y < squad.y) continue;
      pair.passed = true;
      if (squad.units <= 0) continue;

      const gate = squad.x < ROAD_CENTER ? pair.left : pair.right;
      const before = squad.units;
      const after = applyGate(before, gate);
      const good = isBeneficial(gate);
      this.setUnits(after);
      this.juice.float(
        squad.x,
        squad.y - this.squadRadius - 24,
        gateLabel(gate),
        good ? PALETTE.gateGood : PALETTE.gateBad,
        28,
      );
      this.juice.burst(
        squad.x,
        squad.y,
        good ? PALETTE.gateGood : PALETTE.gateBad,
        good ? 24 : 16,
        180,
      );
      this.juice.shake(good ? 0.2 : 0.45);
      if (after <= 0) this.loseUnits(0, squad.x, squad.y);
    }
  }

  private updateCrates(dt: number): void {
    const squad = this.squad;
    for (const crate of this.crates) {
      crate.y += SCROLL_SPEED * dt;
      crate.flash = Math.max(0, crate.flash - dt);
      if (
        !crate.dead &&
        squad.units > 0 &&
        circleRectOverlap(
          squad.x,
          squad.y,
          this.squadRadius,
          crate.x,
          crate.y,
          CRATE.width / 2,
          CRATE.height / 2,
        )
      ) {
        crate.dead = true;
        this.juice.burst(crate.x, crate.y, PALETTE.crate, 18, 160, 4);
        this.loseUnits(CRATE.contactDamage, crate.x, crate.y + CRATE.height / 2);
      }
    }
  }

  private updateZombies(dt: number): void {
    const squad = this.squad;
    const radius = this.squadRadius;
    for (const zombie of this.zombies) {
      zombie.phase += dt * 6;
      zombie.flash = Math.max(0, zombie.flash - dt);
      zombie.y += (SCROLL_SPEED * 0.5 + zombie.speed) * dt;
      if (zombie.y > 0) {
        zombie.x += clamp(squad.x - zombie.x, -1, 1) * ZOMBIE.homing * dt;
      }

      if (
        zombie.dead ||
        squad.units <= 0 ||
        !circlesOverlap(zombie.x, zombie.y, zombie.r, squad.x, squad.y, radius)
      ) {
        continue;
      }

      this.loseUnits(zombie.damage, zombie.x, zombie.y);
      if (zombie.kind === 'brute') {
        // Brutes shrug it off, stagger back, and come again.
        zombie.y -= ZOMBIE.bruteKnockback;
        zombie.flash = 0.15;
      } else {
        this.killZombie(zombie);
      }
    }
  }

  private updateBoss(dt: number): void {
    const boss = this.boss;
    if (!boss || boss.dead) return;
    const squad = this.squad;
    boss.phase += dt * 3;
    if (this.rng() < dt * 2) this.addDecal(boss.x, boss.y + boss.r * 0.6, 7, PALETTE.blood);
    boss.flash = Math.max(0, boss.flash - dt);
    boss.y += BOSS.speed * dt;
    boss.x += clamp(squad.x - boss.x, -1, 1) * BOSS.homing * dt;

    if (
      squad.units > 0 &&
      circlesOverlap(boss.x, boss.y, boss.r, squad.x, squad.y, this.squadRadius)
    ) {
      this.loseUnits(squad.units, squad.x, squad.y);
    }
  }

  // --- Combat -------------------------------------------------------------------

  private resolveBulletHits(): void {
    const volleyShare = 1 / Math.max(1, Math.min(this.squad.units, SQUAD.maxShooters));

    for (const bullet of this.bullets) {
      if (bullet.dead) continue;
      const r = WEAPON.bulletRadius;

      const boss = this.boss;
      if (boss && !boss.dead && circlesOverlap(bullet.x, bullet.y, r, boss.x, boss.y, boss.r)) {
        bullet.dead = true;
        this.damageBoss(boss, bullet);
        continue;
      }

      for (const zombie of this.zombies) {
        if (zombie.dead || !circlesOverlap(bullet.x, bullet.y, r, zombie.x, zombie.y, zombie.r)) {
          continue;
        }
        bullet.dead = true;
        this.damageZombie(zombie, bullet.damage);
        break;
      }
      if (bullet.dead) continue;

      for (const crate of this.crates) {
        if (
          crate.dead ||
          !circleRectOverlap(
            bullet.x,
            bullet.y,
            r,
            crate.x,
            crate.y,
            CRATE.width / 2,
            CRATE.height / 2,
          )
        ) {
          continue;
        }
        bullet.dead = true;
        this.damageCrate(crate, bullet.damage);
        break;
      }
      if (bullet.dead) continue;

      for (const pair of this.gates) {
        if (pair.passed || Math.abs(bullet.y - pair.y) > GATE.height / 2) continue;
        const gate = bullet.x < ROAD_CENTER ? pair.left : pair.right;
        bullet.dead = true;
        gate.flash = 0.06;
        if (chargeGate(gate, volleyShare)) {
          this.juice.burst(bullet.x, pair.y, PALETTE.bullet, 3, 80, 2);
        }
        break;
      }
    }
  }

  private damageZombie(zombie: Zombie, damage: number): void {
    if (zombie.dead) return;
    zombie.hp -= damage;
    zombie.flash = 0.08;
    zombie.y -= zombie.kind === 'brute' ? 0.4 : 1.5;
    if (zombie.hp <= 0) this.killZombie(zombie);
  }

  private killZombie(zombie: Zombie): void {
    zombie.dead = true;
    this.stats.kills++;
    const { x, y, r } = zombie;

    if (zombie.kind === 'bloater') {
      this.juice.burst(x, y, PALETTE.bile, 26, 200, 4);
      this.juice.burst(x, y, PALETTE.blood, 12, 160, 3);
      this.addDecal(x, y, r * 2.4, PALETTE.bile);
      this.juice.shake(0.3);
      for (const other of this.zombies) {
        if (
          other.dead ||
          !circlesOverlap(x, y, ZOMBIE.bloaterBlastRadius, other.x, other.y, other.r)
        ) {
          continue;
        }
        this.damageZombie(other, other.maxHp * ZOMBIE.bloaterBlastDamage);
      }
      return;
    }

    const big = zombie.kind === 'brute';
    this.juice.burst(x, y, PALETTE.blood, big ? 26 : 9, big ? 180 : 120, big ? 4 : 3);
    this.juice.burst(x, y, PALETTE.gore, big ? 12 : 3, 90, 4);
    this.addDecal(
      x,
      y,
      r * (big ? 1.9 : 1.4),
      this.rng() < 0.5 ? PALETTE.blood : PALETTE.bloodDark,
    );
    if (big) this.juice.shake(0.35);
  }

  private damageCrate(crate: Crate, damage: number): void {
    crate.hp -= damage;
    crate.flash = 0.06;
    if (crate.hp > 0) return;

    crate.dead = true;
    this.applyUpgrade(crate.upgrade, crate.amount);
    this.juice.burst(crate.x, crate.y, PALETTE.crate, 22, 180, 4);
    this.juice.burst(crate.x, crate.y, PALETTE.muzzle, 14, 220, 3);
    this.juice.float(crate.x, crate.y, UPGRADE_LABELS[crate.upgrade], PALETTE.muzzle, 18);
    this.juice.shake(0.3);
  }

  private damageBoss(boss: Boss, bullet: Bullet): void {
    boss.hp -= bullet.damage;
    boss.flash = 0.05;
    if (this.rng() < 0.2) this.juice.burst(bullet.x, bullet.y, PALETTE.blood, 2, 90);
    if (boss.hp > 0) return;

    boss.dead = true;
    this.stats.kills++;
    this.slowMo = JUICE.bossSlowMoDuration;
    this.juice.burst(boss.x, boss.y, PALETTE.blood, 70, 280, 5);
    this.juice.burst(boss.x, boss.y, PALETTE.gore, 40, 220, 6);
    this.addDecal(boss.x, boss.y, boss.r * 2.2, PALETTE.bloodDark);
    this.juice.shake(1);
    for (const zombie of this.zombies) {
      if (!zombie.dead) this.killZombie(zombie);
    }
    this.finish('won');
  }

  private applyUpgrade(kind: UpgradeKind, amount: number): void {
    const squad = this.squad;
    switch (kind) {
      case 'fireRate':
        squad.fireRateLevel = Math.min(UPGRADE_CAPS.fireRate, squad.fireRateLevel + amount);
        break;
      case 'damage':
        squad.damageLevel = Math.min(UPGRADE_CAPS.damage, squad.damageLevel + amount);
        break;
      case 'spread':
        squad.spreadLevel = Math.min(UPGRADE_CAPS.spread, squad.spreadLevel + amount);
        break;
      case 'units':
        this.setUnits(Math.min(SQUAD.maxUnits, squad.units + amount));
        break;
    }
  }

  private cleanup(): void {
    const limit = this.viewHeight + 80;
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.zombies = this.zombies.filter((z) => !z.dead && z.y < limit);
    this.crates = this.crates.filter((c) => !c.dead && c.y < limit);
    this.gates = this.gates.filter((g) => g.y < limit);
  }
}

const rampValue = ([from, to]: StreamPhase['rate'], t: number): number => from + (to - from) * t;
