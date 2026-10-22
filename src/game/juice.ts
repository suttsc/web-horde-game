import { JUICE } from './tuning';
import { clamp } from './math';
import type { Rng } from './rng';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

/** Screen shake, particles and floating text: the "feel" layer. */
export class Juice {
  particles: Particle[] = [];
  texts: FloatingText[] = [];
  private trauma = 0;

  constructor(private readonly rng: Rng) {}

  shake(amount: number): void {
    this.trauma = clamp(this.trauma + amount, 0, JUICE.maxTrauma);
  }

  burst(x: number, y: number, color: string, count: number, speed = 120, size = 3): void {
    for (let i = 0; i < count; i++) {
      const angle = this.rng() * Math.PI * 2;
      const velocity = speed * (0.35 + this.rng() * 0.65);
      const life = 0.3 + this.rng() * 0.35;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life,
        maxLife: life,
        size: size * (0.6 + this.rng() * 0.8),
        color,
      });
    }
  }

  /** A spent shell flicked out to the side of the squad. */
  casing(x: number, y: number, color: string): void {
    const life = 0.3 + this.rng() * 0.2;
    this.particles.push({
      x,
      y,
      vx: 70 + this.rng() * 70,
      vy: -30 + this.rng() * 50,
      life,
      maxLife: life,
      size: 2,
      color,
    });
  }

  float(x: number, y: number, text: string, color: string, size = 18): void {
    this.texts.push({ x, y, text, color, size, life: 1, maxLife: 1 });
  }

  shakeOffset(): { x: number; y: number } {
    const power = this.trauma * this.trauma * JUICE.maxShake;
    return { x: (this.rng() * 2 - 1) * power, y: (this.rng() * 2 - 1) * power };
  }

  update(dt: number): void {
    this.trauma = Math.max(0, this.trauma - JUICE.traumaDecay * dt);

    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 38 * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  clear(): void {
    this.particles = [];
    this.texts = [];
    this.trauma = 0;
  }
}
