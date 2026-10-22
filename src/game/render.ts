import type { Game } from './Game';
import { gateLabel, isBeneficial } from './gates';
import { PALETTE } from './palette';
import { CRATE, GATE, ROAD_CENTER, ROAD_LEFT, ROAD_RIGHT, SQUAD, WORLD_WIDTH } from './tuning';
import type { Boss, Crate, Gate, GatePair, UpgradeKind, Zombie } from './types';

type Ctx = CanvasRenderingContext2D;

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const UPGRADE_ICONS: Record<UpgradeKind, string> = {
  fireRate: 'RATE',
  damage: 'DMG',
  spread: 'SPREAD',
  units: '+MEN',
};

export interface Viewport {
  /** Device pixels per virtual pixel. */
  ratio: number;
  /** Horizontal offset in device pixels, used to centre the world when letterboxed. */
  offsetX: number;
}

/** Draws the whole frame. */
export const render = (ctx: Ctx, game: Game, viewport: Viewport): void => {
  const height = game.viewHeight;
  ctx.setTransform(viewport.ratio, 0, 0, viewport.ratio, viewport.offsetX, 0);

  const shake = game.juice.shakeOffset();
  ctx.save();
  ctx.translate(shake.x, shake.y);

  drawBackground(ctx, game.scroll, height);
  for (const pair of game.gates) drawGatePair(ctx, pair);
  for (const crate of game.crates) drawCrate(ctx, crate);
  for (const zombie of game.zombies) drawZombie(ctx, zombie);
  if (game.boss && !game.boss.dead) drawBoss(ctx, game.boss);
  drawBullets(ctx, game);
  if (game.squad.units > 0) drawSquad(ctx, game);
  drawParticles(ctx, game);
  drawFloatingTexts(ctx, game);

  ctx.restore();

  if (game.boss && !game.boss.dead) drawBossBar(ctx, game.boss);
};

// --- Background -------------------------------------------------------------------

const DECALS = Array.from({ length: 14 }, (_, i) => ({
  x: ROAD_LEFT + 20 + ((i * 97) % (ROAD_RIGHT - ROAD_LEFT - 40)),
  y: (i * 173) % 900,
  r: 6 + ((i * 7) % 14),
  blood: i % 3 === 0,
}));

const drawBackground = (ctx: Ctx, scroll: number, height: number): void => {
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(-400, -20, WORLD_WIDTH + 800, height + 40);

  // Verge stripes give a sense of speed.
  ctx.fillStyle = PALETTE.groundDetail;
  const stripe = 46;
  for (let y = (scroll % stripe) - stripe; y < height + stripe; y += stripe) {
    ctx.fillRect(0, y, ROAD_LEFT - 6, stripe / 2);
    ctx.fillRect(ROAD_RIGHT + 6, y, WORLD_WIDTH - ROAD_RIGHT - 6, stripe / 2);
  }

  ctx.fillStyle = PALETTE.road;
  ctx.fillRect(ROAD_LEFT, -20, ROAD_RIGHT - ROAD_LEFT, height + 40);

  for (const decal of DECALS) {
    const y = ((decal.y + scroll) % 900) - 120;
    ctx.fillStyle = decal.blood ? 'rgba(127, 29, 29, 0.35)' : PALETTE.roadDetail;
    ctx.beginPath();
    ctx.ellipse(decal.x, y, decal.r, decal.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hazard edges.
  const edge = 22;
  for (let y = (scroll % edge) - edge; y < height + edge; y += edge) {
    ctx.fillStyle = PALETTE.hazard;
    ctx.fillRect(ROAD_LEFT - 6, y, 6, edge / 2);
    ctx.fillRect(ROAD_RIGHT, y, 6, edge / 2);
    ctx.fillStyle = PALETTE.hazardDark;
    ctx.fillRect(ROAD_LEFT - 6, y + edge / 2, 6, edge / 2);
    ctx.fillRect(ROAD_RIGHT, y + edge / 2, 6, edge / 2);
  }

  // Lane dashes.
  ctx.fillStyle = PALETTE.laneMark;
  const dash = 48;
  for (let y = (scroll % dash) - dash; y < height + dash; y += dash) {
    ctx.fillRect(ROAD_CENTER - 2, y, 4, dash / 2);
  }
};

// --- Gates & crates -----------------------------------------------------------------

const drawGatePair = (ctx: Ctx, pair: GatePair): void => {
  drawGate(ctx, pair.left, pair.y);
  drawGate(ctx, pair.right, pair.y);

  // Centre post.
  ctx.fillStyle = '#1f2937';
  roundRect(ctx, ROAD_CENTER - 4, pair.y - GATE.height / 2 - 6, 8, GATE.height + 12, 3);
  ctx.fill();
};

const drawGate = (ctx: Ctx, gate: Gate, y: number): void => {
  const good = isBeneficial(gate);
  const width = gate.right - gate.left;
  const top = y - GATE.height / 2;

  ctx.fillStyle =
    gate.flash > 0 ? 'rgba(255,255,255,0.45)' : good ? PALETTE.gateGoodFill : PALETTE.gateBadFill;
  ctx.fillRect(gate.left + 2, top, width - 4, GATE.height);

  ctx.fillStyle = good ? PALETTE.gateGood : PALETTE.gateBad;
  ctx.fillRect(gate.left + 2, top, width - 4, 4);
  ctx.fillRect(gate.left + 2, top + GATE.height - 4, width - 4, 4);

  // Charge meter for gates that can be shot up.
  if (gate.op === 'add' && gate.charge > 0) {
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(gate.left + 2, top + GATE.height - 4, (width - 4) * gate.charge, 4);
  }

  ctx.font = `900 24px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = PALETTE.shadow;
  const label = gateLabel(gate);
  const cx = gate.left + width / 2;
  ctx.strokeText(label, cx, y + 1);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(label, cx, y + 1);
};

const drawCrate = (ctx: Ctx, crate: Crate): void => {
  const w = CRATE.width;
  const h = CRATE.height;
  const x = crate.x - w / 2;
  const y = crate.y - h / 2;

  ctx.fillStyle = PALETTE.shadow;
  roundRect(ctx, x + 3, y + 5, w, h, 6);
  ctx.fill();

  ctx.fillStyle = crate.flash > 0 ? PALETTE.white : PALETTE.crate;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = PALETTE.crateDark;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = PALETTE.crateStrap;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 6);
  ctx.lineTo(x + w - 6, y + h - 6);
  ctx.moveTo(x + w - 6, y + 6);
  ctx.lineTo(x + 6, y + h - 6);
  ctx.stroke();

  // Upgrade label.
  ctx.fillStyle = PALETTE.crateDark;
  roundRect(ctx, crate.x - 26, crate.y - 9, 52, 18, 5);
  ctx.fill();
  ctx.font = `800 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.bullet;
  ctx.fillText(UPGRADE_ICONS[crate.upgrade], crate.x, crate.y + 1);

  // HP above.
  ctx.font = `900 15px ${FONT}`;
  ctx.lineWidth = 4;
  ctx.strokeStyle = PALETTE.shadow;
  const hp = String(Math.ceil(crate.hp));
  ctx.strokeText(hp, crate.x, y - 10);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(hp, crate.x, y - 10);
};

// --- Characters -----------------------------------------------------------------------

const drawZombie = (ctx: Ctx, zombie: Zombie): void => {
  const brute = zombie.kind === 'brute';
  const r = zombie.r;
  const sway = Math.sin(zombie.phase) * r * 0.18;
  const skin = zombie.flash > 0 ? PALETTE.white : brute ? PALETTE.brute : PALETTE.zombie;
  const outline = brute ? PALETTE.bruteDark : PALETTE.zombieDark;

  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(zombie.x + 2, zombie.y + r * 0.6, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arms reaching towards the player (down the screen).
  ctx.fillStyle = skin;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(
      zombie.x + side * r * 0.65,
      zombie.y + r * 0.85 + side * sway,
      r * 0.32,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(zombie.x + sway * 0.4, zombie.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.eye;
  const eye = Math.max(1.6, r * 0.16);
  ctx.beginPath();
  ctx.arc(zombie.x - r * 0.35 + sway * 0.4, zombie.y + r * 0.25, eye, 0, Math.PI * 2);
  ctx.arc(zombie.x + r * 0.35 + sway * 0.4, zombie.y + r * 0.25, eye, 0, Math.PI * 2);
  ctx.fill();

  if (brute) drawHealthBar(ctx, zombie.x, zombie.y - r - 7, r * 2, zombie.hp / zombie.maxHp);
};

const drawBoss = (ctx: Ctx, boss: Boss): void => {
  const r = boss.r;
  const pulse = 1 + Math.sin(boss.phase * 2) * 0.03;
  const sway = Math.sin(boss.phase) * 4;

  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(boss.x + 4, boss.y + r * 0.6, r * 1.1, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = boss.flash > 0 ? PALETTE.white : PALETTE.boss;
  ctx.strokeStyle = PALETTE.bossDark;
  ctx.lineWidth = 4;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(boss.x + side * r * 0.8, boss.y + r * 0.75 + side * sway, r * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(boss.x, boss.y, r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Stitches and glowing eyes.
  ctx.strokeStyle = PALETTE.bossDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(boss.x - r * 0.5, boss.y - r * 0.45);
  ctx.lineTo(boss.x + r * 0.1, boss.y - r * 0.2);
  ctx.stroke();

  ctx.fillStyle = PALETTE.eye;
  ctx.beginPath();
  ctx.arc(boss.x - r * 0.32, boss.y + r * 0.2, r * 0.13, 0, Math.PI * 2);
  ctx.arc(boss.x + r * 0.32, boss.y + r * 0.2, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
};

const drawBossBar = (ctx: Ctx, boss: Boss): void => {
  const x = 40;
  const y = 64;
  const w = WORLD_WIDTH - 80;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, x - 4, y - 4, w + 8, 18, 6);
  ctx.fill();
  ctx.fillStyle = PALETTE.boss;
  roundRect(ctx, x, y, w * Math.max(0, boss.hp / boss.maxHp), 10, 4);
  ctx.fill();
  ctx.font = `900 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('ABOMINATION', WORLD_WIDTH / 2, y + 18);
};

const drawSquad = (ctx: Ctx, game: Game): void => {
  const squad = game.squad;
  const count = game.renderedUnits;
  const r = SQUAD.unitRadius;
  const hurt = squad.flash > 0;

  // Draw back-to-front so the formation layers nicely.
  const order = game.formation
    .slice(0, count)
    .map((offset, i) => ({ offset, i }))
    .sort((a, b) => a.offset.y - b.offset.y);

  for (const { offset } of order) {
    const x = squad.x + offset.x;
    const y = squad.y + offset.y;

    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 1.5, y + r * 0.7, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.gun;
    ctx.fillRect(x + r * 0.35, y - r * 1.7, 2.5, r * 1.4);

    ctx.fillStyle = hurt ? PALETTE.eye : PALETTE.soldier;
    ctx.strokeStyle = PALETTE.soldierDark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.helmet;
    ctx.beginPath();
    ctx.arc(x, y - 0.5, r * 0.58, 0, Math.PI * 2);
    ctx.fill();
  }

  // Unit counter bubble.
  const label = String(squad.units);
  const top = squad.y - game.squadRadius - 26;
  ctx.font = `900 16px ${FONT}`;
  const width = Math.max(34, ctx.measureText(label).width + 18);
  ctx.fillStyle = PALETTE.gateGood;
  roundRect(ctx, squad.x - width / 2, top - 11, width, 22, 11);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(label, squad.x, top + 1);
};

const drawBullets = (ctx: Ctx, game: Game): void => {
  ctx.fillStyle = PALETTE.bulletGlow;
  for (const b of game.bullets) ctx.fillRect(b.x - 2.5, b.y - 6, 5, 12);
  ctx.fillStyle = PALETTE.bullet;
  for (const b of game.bullets) ctx.fillRect(b.x - 1, b.y - 5, 2, 10);
};

// --- Effects ----------------------------------------------------------------------------

const drawParticles = (ctx: Ctx, game: Game): void => {
  for (const p of game.juice.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
};

const drawFloatingTexts = (ctx: Ctx, game: Game): void => {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of game.juice.texts) {
    const progress = 1 - t.life / t.maxLife;
    const pop = progress < 0.15 ? 0.6 + (progress / 0.15) * 0.5 : 1.1 - Math.min(0.1, progress);
    ctx.globalAlpha = Math.min(1, t.life * 2.5);
    ctx.font = `900 ${Math.round(t.size * pop)}px ${FONT}`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
};

// --- Helpers ----------------------------------------------------------------------------

const drawHealthBar = (ctx: Ctx, cx: number, y: number, width: number, ratio: number): void => {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(cx - width / 2, y, width, 4);
  ctx.fillStyle = PALETTE.eye;
  ctx.fillRect(cx - width / 2, y, width * Math.max(0, ratio), 4);
};

const roundRect = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void => {
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(0, w), h, r);
};
