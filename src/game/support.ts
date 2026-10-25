import type { Juice } from './juice';
import { circlesOverlap } from './math';
import { PALETTE } from './palette';
import type { PerkStacks } from './perks';
import type { Rng } from './rng';
import { PERK, SCROLL_SPEED } from './tuning';
import type { Boss, FirePatch, Grenade, Squad, Tracer, Zombie } from './types';

export interface SupportTargets {
  readonly zombies: readonly Zombie[];
  readonly boss: Boss | null;
  readonly squad: Squad;
}

/** How support fire reaches back into the game; keeps kill bookkeeping in one place. */
export interface SupportCallbacks {
  damageZombie: (zombie: Zombie, damage: number, knockback?: boolean) => void;
  damageBoss: (damage: number, x: number, y: number) => void;
  scorch: (x: number, y: number, radius: number) => void;
}

/** Perk-driven support weapons: grenades, incendiary fires and the overwatch sniper. */
export class SupportFire {
  grenades: Grenade[] = [];
  fires: FirePatch[] = [];
  tracers: Tracer[] = [];
  private grenadeTimer: number = PERK.grenadier.interval;
  private sniperTimer: number = PERK.overwatch.interval;

  constructor(
    private readonly juice: Juice,
    private readonly rng: Rng,
    private readonly callbacks: SupportCallbacks,
  ) {}

  update(dt: number, targets: SupportTargets, perks: PerkStacks, volleyDamage: number): void {
    this.updateGrenades(dt, targets, perks.grenadier ?? 0, volleyDamage);
    this.updateSniper(dt, targets, perks.overwatch ?? 0, volleyDamage);
    this.updateFires(dt, targets);
    for (const tracer of this.tracers) tracer.life -= dt;
    this.tracers = this.tracers.filter((t) => t.life > 0);
  }

  /** Called on each kill while Incendiary is active. */
  ignite(x: number, y: number, stacks: number, volleyDamage: number): void {
    const { radius, duration, volleyDps } = PERK.incendiary;
    this.fires.push({
      x,
      y,
      r: radius,
      life: duration,
      maxLife: duration,
      dps: volleyDamage * volleyDps * stacks,
    });
  }

  private updateGrenades(
    dt: number,
    { zombies, squad }: SupportTargets,
    stacks: number,
    volleyDamage: number,
  ): void {
    const { interval, flightTime, radius, volleys } = PERK.grenadier;

    if (stacks > 0 && squad.units > 0) {
      this.grenadeTimer -= dt;
      if (this.grenadeTimer <= 0) {
        this.grenadeTimer = interval / (1 + 0.5 * (stacks - 1));
        // Aim at the closest zombie that's still a safe distance ahead.
        const target = zombies
          .filter((z) => !z.dead && z.y > 20 && z.y < squad.y - 70)
          .reduce<Zombie | undefined>((best, z) => (!best || z.y > best.y ? z : best), undefined);
        if (target) {
          this.grenades.push({
            fromX: squad.x,
            fromY: squad.y - 10,
            x: target.x,
            // Lead the target: it keeps walking while the grenade flies.
            y: target.y + (SCROLL_SPEED * 0.5 + target.speed) * flightTime,
            t: 0,
            damage: volleyDamage * volleys,
          });
        }
      }
    }

    for (const grenade of this.grenades) {
      grenade.t += dt / flightTime;
      grenade.y += SCROLL_SPEED * dt;
      grenade.fromY += SCROLL_SPEED * dt;
      if (grenade.t < 1) continue;

      this.juice.burst(grenade.x, grenade.y, PALETTE.muzzle, 22, 220, 4);
      this.juice.burst(grenade.x, grenade.y, '#3a332b', 14, 120, 6);
      this.juice.shake(0.25);
      this.callbacks.scorch(grenade.x, grenade.y, radius * 0.6);
      for (const zombie of zombies) {
        if (
          !zombie.dead &&
          circlesOverlap(grenade.x, grenade.y, radius, zombie.x, zombie.y, zombie.r)
        ) {
          this.callbacks.damageZombie(zombie, grenade.damage);
        }
      }
    }
    this.grenades = this.grenades.filter((g) => g.t < 1);
  }

  private updateSniper(
    dt: number,
    { zombies, boss, squad }: SupportTargets,
    stacks: number,
    volleyDamage: number,
  ): void {
    if (stacks === 0 || squad.units <= 0) return;
    this.sniperTimer -= dt;
    if (this.sniperTimer > 0) return;
    this.sniperTimer = PERK.overwatch.interval / stacks;

    const damage = volleyDamage * PERK.overwatch.volleys;
    const toughest = zombies
      .filter((z) => !z.dead && z.y > 0 && z.y < squad.y)
      .reduce<Zombie | undefined>((best, z) => (!best || z.hp > best.hp ? z : best), undefined);

    if (boss && !boss.dead && boss.y > 0 && (!toughest || boss.hp > toughest.hp)) {
      this.fireTracer(squad, boss.x, boss.y);
      this.callbacks.damageBoss(damage, boss.x, boss.y);
    } else if (toughest) {
      this.fireTracer(squad, toughest.x, toughest.y);
      this.callbacks.damageZombie(toughest, damage);
    }
  }

  private fireTracer(squad: Squad, x: number, y: number): void {
    this.tracers.push({ x1: squad.x - 14, y1: squad.y + 10, x2: x, y2: y, life: 0.14 });
    this.juice.burst(x, y, PALETTE.blood, 6, 140, 3);
  }

  private updateFires(dt: number, { zombies }: SupportTargets): void {
    for (const fire of this.fires) {
      fire.life -= dt;
      fire.y += SCROLL_SPEED * dt;
      if (this.rng() < dt * 8) {
        this.juice.burst(
          fire.x + (this.rng() - 0.5) * fire.r,
          fire.y + (this.rng() - 0.5) * fire.r * 0.6,
          this.rng() < 0.5 ? '#f97316' : '#fbbf24',
          1,
          40,
          2,
        );
      }
      for (const zombie of zombies) {
        if (!zombie.dead && circlesOverlap(fire.x, fire.y, fire.r, zombie.x, zombie.y, zombie.r)) {
          this.callbacks.damageZombie(zombie, fire.dps * dt, false);
        }
      }
    }
    this.fires = this.fires.filter((f) => f.life > 0);
  }
}
