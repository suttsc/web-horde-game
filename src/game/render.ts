import type { Game } from './Game';
import { gateLabel, isBeneficial, isMaxed } from './gates';
import { PALETTE } from './palette';
import { createRng, range } from './rng';
import { CRATE, GATE, ROAD_CENTER, ROAD_LEFT, ROAD_RIGHT, SQUAD, WORLD_WIDTH } from './tuning';
import type { Boss, Crate, Decal, Gate, GatePair, UpgradeKind, Zombie } from './types';

type Ctx = CanvasRenderingContext2D;

export const DISPLAY_FONT = '"Black Ops One", Impact, "Arial Black", sans-serif';

const UPGRADE_LABELS: Record<UpgradeKind, string> = {
  fireRate: 'RATE+',
  damage: 'DMG+',
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
  for (const decal of game.decals) drawDecal(ctx, decal);
  drawFires(ctx, game);
  for (const pair of game.gates) drawGatePair(ctx, pair);
  for (const crate of game.crates) drawCrate(ctx, crate);
  for (const zombie of game.zombies) drawZombie(ctx, zombie);
  if (game.boss && !game.boss.dead) drawBoss(ctx, game.boss);
  drawBullets(ctx, game);
  drawSupport(ctx, game);
  if (game.squad.units > 0 && game.status !== 'menu') drawSquad(ctx, game);
  drawParticles(ctx, game);
  drawFloatingTexts(ctx, game);

  ctx.restore();

  drawPostEffects(ctx, game, height);
  if (game.boss && !game.boss.dead) drawBossBar(ctx, game.boss);
};

// --- Background -------------------------------------------------------------------

const TILE_HEIGHT = 720;
const TILE_SCALE = 2;
let roadTile: HTMLCanvasElement | null = null;

/** Scrolls a pre-rendered, seamlessly wrapping road texture. */
const drawBackground = (ctx: Ctx, scroll: number, height: number): void => {
  roadTile ??= createRoadTile();

  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(-400, -20, WORLD_WIDTH + 800, height + 40);

  const offset = scroll % TILE_HEIGHT;
  for (let y = offset - TILE_HEIGHT; y < height + 20; y += TILE_HEIGHT) {
    ctx.drawImage(roadTile, 0, y, WORLD_WIDTH, TILE_HEIGHT);
  }
};

const createRoadTile = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD_WIDTH * TILE_SCALE;
  canvas.height = TILE_HEIGHT * TILE_SCALE;
  const tile = canvas.getContext('2d');
  if (!tile) return canvas;
  tile.scale(TILE_SCALE, TILE_SCALE);
  const rng = createRng(99);

  // Draws `paint` at y and its wrapped copies so the tile repeats seamlessly.
  const wrapped = (y: number, paint: (y: number) => void): void => {
    paint(y);
    paint(y - TILE_HEIGHT);
    paint(y + TILE_HEIGHT);
  };

  // Verges: mud, rubble and dead grass.
  tile.fillStyle = PALETTE.ground;
  tile.fillRect(0, 0, WORLD_WIDTH, TILE_HEIGHT);
  for (let i = 0; i < 140; i++) {
    const left = rng() < 0.5;
    const x = left ? range(rng, 0, ROAD_LEFT - 8) : range(rng, ROAD_RIGHT + 8, WORLD_WIDTH);
    const y = rng() * TILE_HEIGHT;
    const r = range(rng, 1, 5);
    tile.fillStyle = rng() < 0.6 ? PALETTE.mud : PALETTE.groundDetail;
    wrapped(y, (yy) => {
      tile.beginPath();
      tile.ellipse(x, yy, r * 1.4, r, rng() * Math.PI, 0, Math.PI * 2);
      tile.fill();
    });
  }
  tile.strokeStyle = '#2c2a17';
  tile.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const left = rng() < 0.5;
    const x = left ? range(rng, 0, ROAD_LEFT - 8) : range(rng, ROAD_RIGHT + 8, WORLD_WIDTH);
    const y = rng() * TILE_HEIGHT;
    wrapped(y, (yy) => {
      tile.beginPath();
      tile.moveTo(x, yy);
      tile.lineTo(x + range(rng, -3, 3), yy - range(rng, 3, 7));
      tile.stroke();
    });
  }

  // Asphalt with speckle.
  tile.fillStyle = PALETTE.road;
  tile.fillRect(ROAD_LEFT, 0, ROAD_RIGHT - ROAD_LEFT, TILE_HEIGHT);
  for (let i = 0; i < 2600; i++) {
    tile.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.18)';
    tile.fillRect(range(rng, ROAD_LEFT, ROAD_RIGHT), rng() * TILE_HEIGHT, 1, 1);
  }

  // Repair patches and oil stains.
  for (let i = 0; i < 7; i++) {
    const w = range(rng, 30, 90);
    const h = range(rng, 20, 70);
    const x = range(rng, ROAD_LEFT, ROAD_RIGHT - w);
    const y = rng() * TILE_HEIGHT;
    tile.fillStyle = rng() < 0.5 ? PALETTE.roadDetail : '#211f1b';
    wrapped(y, (yy) => tile.fillRect(x, yy, w, h));
  }
  for (let i = 0; i < 10; i++) {
    const x = range(rng, ROAD_LEFT + 20, ROAD_RIGHT - 20);
    const y = rng() * TILE_HEIGHT;
    const r = range(rng, 8, 22);
    tile.fillStyle = 'rgba(8, 8, 6, 0.35)';
    wrapped(y, (yy) => {
      tile.beginPath();
      tile.ellipse(x, yy, r, r * 0.6, rng() * Math.PI, 0, Math.PI * 2);
      tile.fill();
    });
  }

  // Tyre skids.
  tile.strokeStyle = 'rgba(0,0,0,0.22)';
  tile.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    const x = range(rng, ROAD_LEFT + 40, ROAD_RIGHT - 60);
    const y = rng() * TILE_HEIGHT;
    const bend = range(rng, -40, 40);
    wrapped(y, (yy) => {
      for (const dx of [0, 16]) {
        tile.beginPath();
        tile.moveTo(x + dx, yy);
        tile.quadraticCurveTo(x + dx + bend, yy + 80, x + dx + bend * 0.4, yy + 160);
        tile.stroke();
      }
    });
  }

  // Cracks.
  tile.strokeStyle = PALETTE.roadCrack;
  tile.lineWidth = 1.2;
  for (let i = 0; i < 18; i++) {
    let x = range(rng, ROAD_LEFT + 6, ROAD_RIGHT - 6);
    const y0 = rng() * TILE_HEIGHT;
    const points: [number, number][] = [[x, y0]];
    let y = y0;
    for (let s = 0; s < 6; s++) {
      x += range(rng, -9, 9);
      y += range(rng, 4, 14);
      points.push([x, y]);
    }
    wrapped(0, (offset) => {
      tile.beginPath();
      points.forEach(([px, py], index) =>
        index === 0 ? tile.moveTo(px, py + offset) : tile.lineTo(px, py + offset),
      );
      tile.stroke();
    });
  }

  // Worn centre dashes.
  for (let y = 0; y < TILE_HEIGHT; y += 48) {
    tile.globalAlpha = range(rng, 0.25, 0.7);
    tile.fillStyle = PALETTE.laneMark;
    tile.fillRect(ROAD_CENTER - 2, y, 4, 24);
  }
  tile.globalAlpha = 1;

  // Concrete curbs.
  for (let y = 0; y < TILE_HEIGHT; y += 24) {
    const shade = rng() < 0.5 ? '#4a463c' : '#3d3a32';
    tile.fillStyle = shade;
    tile.fillRect(ROAD_LEFT - 7, y, 7, 23);
    tile.fillRect(ROAD_RIGHT, y, 7, 23);
    tile.fillStyle = 'rgba(0,0,0,0.35)';
    tile.fillRect(ROAD_LEFT - 7, y + 21, 7, 2);
    tile.fillRect(ROAD_RIGHT, y + 21, 7, 2);
  }

  return canvas;
};

const drawDecal = (ctx: Ctx, decal: Decal): void => {
  const count = decal.shape.length;
  const point = (i: number, scale = 1): [number, number] => {
    const angle = decal.rotation + (i / count) * Math.PI * 2;
    const radius = (decal.shape[i % count] ?? 0) * scale;
    return [decal.x + Math.cos(angle) * radius, decal.y + Math.sin(angle) * radius * 0.8];
  };

  ctx.fillStyle = decal.color;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  // Smooth blob through the midpoints of the irregular outline.
  const [sx, sy] = point(0);
  const [ex, ey] = point(count - 1);
  ctx.moveTo((sx + ex) / 2, (sy + ey) / 2);
  for (let i = 0; i < count; i++) {
    const [ax, ay] = point(i);
    const [bx, by] = point(i + 1);
    ctx.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2);
  }
  ctx.fill();

  // Splatter droplets flung past the edge.
  ctx.globalAlpha = 0.65;
  for (let i = 0; i < count; i += 2) {
    const [dx, dy] = point(i, 1.45);
    ctx.beginPath();
    ctx.arc(dx, dy, Math.max(1, (decal.shape[i] ?? 4) * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

// --- Post effects -------------------------------------------------------------------

let grain: CanvasPattern | null = null;
let vignette: { height: number; gradient: CanvasGradient } | null = null;
const grainRng = createRng(7);

const drawPostEffects = (ctx: Ctx, game: Game, height: number): void => {
  grain ??= createGrain(ctx);
  if (grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.translate(-grainRng() * 64, -grainRng() * 64);
    ctx.fillStyle = grain;
    ctx.fillRect(-400, 0, WORLD_WIDTH + 864, height + 64);
    ctx.restore();
  }

  if (vignette?.height !== height) {
    const cx = WORLD_WIDTH / 2;
    const gradient = ctx.createRadialGradient(
      cx,
      height * 0.55,
      height * 0.25,
      cx,
      height * 0.5,
      height * 0.8,
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.75)');
    vignette = { height, gradient };
  }
  ctx.fillStyle = vignette.gradient;
  ctx.fillRect(-400, 0, WORLD_WIDTH + 800, height);

  if (game.squad.flash > 0) {
    ctx.fillStyle = `rgba(140, 0, 0, ${Math.min(0.35, game.squad.flash * 2)})`;
    ctx.fillRect(-400, 0, WORLD_WIDTH + 800, height);
  }
};

const createGrain = (ctx: Ctx): CanvasPattern | null => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const noise = canvas.getContext('2d');
  if (!noise) return null;
  const image = noise.createImageData(128, 128);
  const rng = createRng(3);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = Math.floor(rng() * 255);
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  noise.putImageData(image, 0, 0);
  return ctx.createPattern(canvas, 'repeat');
};

// --- Gates & crates -----------------------------------------------------------------

const drawGatePair = (ctx: Ctx, pair: GatePair): void => {
  drawGate(ctx, pair.left, pair.y);
  drawGate(ctx, pair.right, pair.y);
  drawPost(ctx, ROAD_LEFT - 4, pair.y);
  drawPost(ctx, ROAD_CENTER, pair.y);
  drawPost(ctx, ROAD_RIGHT + 4, pair.y);
};

const drawPost = (ctx: Ctx, x: number, y: number): void => {
  const w = 10;
  const h = GATE.height + 14;
  const top = y - h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - w / 2, top, w, h);
  ctx.clip();
  ctx.fillStyle = PALETTE.hazardDark;
  ctx.fillRect(x - w / 2, top, w, h);
  ctx.strokeStyle = PALETTE.hazard;
  ctx.lineWidth = 3;
  for (let s = -w; s < h; s += 8) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, top + s);
    ctx.lineTo(x + w / 2, top + s + w);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = PALETTE.metalDark;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - w / 2, top, w, h);
};

const drawGate = (ctx: Ctx, gate: Gate, y: number): void => {
  const good = isBeneficial(gate);
  const color = good ? PALETTE.gateGood : PALETTE.gateBad;
  const width = gate.right - gate.left;
  const top = y - GATE.height / 2;
  const left = gate.left + 3;
  const inner = width - 6;

  // Grimy mesh panel with a coloured glow.
  ctx.fillStyle = 'rgba(12, 12, 10, 0.55)';
  ctx.fillRect(left, top, inner, GATE.height);
  ctx.fillStyle =
    gate.flash > 0 ? 'rgba(255,240,200,0.35)' : good ? PALETTE.gateGoodGlow : PALETTE.gateBadGlow;
  ctx.fillRect(left, top, inner, GATE.height);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = left + 6; x < left + inner; x += 8) {
    ctx.moveTo(x, top);
    ctx.lineTo(x - 6, top + GATE.height);
  }
  ctx.stroke();

  // Rusted rails.
  for (const railY of [top - 2, top + GATE.height - 3]) {
    ctx.fillStyle = PALETTE.metal;
    ctx.fillRect(left, railY, inner, 5);
    ctx.fillStyle = PALETTE.rust;
    ctx.fillRect(left + inner * 0.2, railY + 1, inner * 0.15, 3);
    ctx.fillRect(left + inner * 0.65, railY + 1, inner * 0.1, 3);
  }
  ctx.fillStyle = color;
  ctx.fillRect(left, top + 3, inner, 2);

  // Charge meter for gates that can be shot up.
  if (gate.op === 'add' && isMaxed(gate)) {
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(left, top + GATE.height - 3, inner, 3);
  } else if (gate.op === 'add' && gate.charge > 0) {
    ctx.fillStyle = PALETTE.muzzle;
    ctx.fillRect(left, top + GATE.height - 3, inner * gate.charge, 3);
  }

  const label = gateLabel(gate);
  const cx = gate.left + width / 2;
  ctx.font = `26px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillText(label, cx, y + 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.globalAlpha = 0.85;
  ctx.fillText(label, cx, y + 2);
  ctx.globalAlpha = 1;
};

const drawCrate = (ctx: Ctx, crate: Crate): void => {
  const w = CRATE.width;
  const h = CRATE.height;
  const x = crate.x - w / 2;
  const y = crate.y - h / 2;

  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(x + 4, y + 6, w, h);

  ctx.fillStyle = crate.flash > 0 ? '#8a8f5a' : PALETTE.crate;
  ctx.fillRect(x, y, w, h);

  // Planks and battered edges.
  ctx.strokeStyle = PALETTE.crateDark;
  ctx.lineWidth = 1;
  for (let py = y + 13; py < y + h; py += 13) {
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
    ctx.stroke();
  }
  ctx.lineWidth = 4;
  ctx.strokeStyle = PALETTE.crateStrap;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = PALETTE.crateStrap;
  ctx.fillRect(x + w * 0.22, y, 5, h);
  ctx.fillRect(x + w * 0.72, y, 5, h);

  ctx.font = `12px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.stencil;
  ctx.globalAlpha = 0.85;
  ctx.fillText(UPGRADE_LABELS[crate.upgrade], crate.x, crate.y + 1);
  ctx.globalAlpha = 1;

  // HP above.
  ctx.font = `16px ${DISPLAY_FONT}`;
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  const hp = String(Math.ceil(crate.hp));
  ctx.strokeText(hp, crate.x, y - 11);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(hp, crate.x, y - 11);
};

// --- Characters -----------------------------------------------------------------------

const ZOMBIE_SKIN: Record<Zombie['kind'], { flesh: string; dark: string }> = {
  runner: { flesh: PALETTE.runnerFlesh, dark: PALETTE.fleshDark },
  walker: { flesh: PALETTE.flesh, dark: PALETTE.fleshDark },
  stalker: { flesh: PALETTE.stalkerFlesh, dark: PALETTE.stalkerDark },
  bloater: { flesh: PALETTE.bloaterFlesh, dark: PALETTE.bloaterDark },
  brute: { flesh: PALETTE.bruteFlesh, dark: PALETTE.bruteDark },
};

const drawZombie = (ctx: Ctx, zombie: Zombie): void => {
  const { x, y, r, kind } = zombie;
  const skin = ZOMBIE_SKIN[kind];
  const sway = Math.sin(zombie.phase) * r * 0.2;
  const stalking = kind === 'stalker' && zombie.dashing;
  // Stalkers lean hard into each dart; everyone else lurches.
  const lurch = stalking ? zombie.dartDir * r * 0.35 : Math.cos(zombie.phase * 0.5) * r * 0.08;

  if (stalking) {
    // Motion smear behind the dash.
    ctx.fillStyle = skin.dark;
    for (const step of [1, 2, 3]) {
      ctx.globalAlpha = 0.22 / step;
      ctx.beginPath();
      ctx.ellipse(x - zombie.dartDir * step * 7, y - step * 6, r * 0.8, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(x + 3, y + r * 0.5, r * 1.15, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arms reaching towards the player (down the screen).
  const armLength = kind === 'bloater' ? 0.3 : kind === 'runner' ? 0.75 : 0.6;
  const hands = [-1, 1].map((side) => ({
    side,
    x: x + side * r * 0.5 + sway * side * 0.3,
    y: y + r * (0.55 + armLength) + side * sway,
  }));
  ctx.lineCap = 'round';
  for (const [color, width] of [
    [skin.dark, Math.max(2.5, r * 0.34)],
    [skin.flesh, Math.max(1.5, r * 0.22)],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (const hand of hands) {
      ctx.beginPath();
      ctx.moveTo(x + hand.side * r * 0.72, y);
      ctx.lineTo(hand.x, hand.y);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
  ctx.fillStyle = skin.dark;
  for (const hand of hands) {
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, Math.max(1.4, r * 0.17), 0, Math.PI * 2);
    ctx.fill();
  }

  // Torso: torn shirt over shoulders (bloaters are bare and swollen).
  const bodyX = x + lurch;
  ctx.fillStyle = kind === 'bloater' ? skin.flesh : zombie.shirt;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const shoulder =
    kind === 'brute'
      ? 1.2
      : kind === 'runner'
        ? 0.85
        : kind === 'stalker'
          ? 0.75
          : kind === 'bloater'
            ? 1.05
            : 1;
  const depth = kind === 'bloater' ? 0.95 : 0.55;
  ctx.ellipse(bodyX, y - r * 0.05, r * shoulder, r * depth, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (kind === 'bloater') {
    ctx.fillStyle = PALETTE.bile;
    for (const [px, py, pr] of [
      [-0.45, -0.3, 0.22],
      [0.4, 0.2, 0.18],
      [0.05, 0.55, 0.14],
    ] as const) {
      ctx.beginPath();
      ctx.arc(bodyX + px * r, y + py * r, pr * r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Tears and blood soaking through.
    ctx.fillStyle = PALETTE.bloodDark;
    ctx.beginPath();
    ctx.ellipse(bodyX - r * 0.35, y + r * 0.15, r * 0.28, r * 0.18, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Head, slightly forward and lolling.
  const headR = r * (kind === 'brute' ? 0.42 : kind === 'bloater' ? 0.38 : 0.48);
  const hx = bodyX + sway * 0.3;
  const hy = y + r * (kind === 'bloater' ? 0.45 : 0.18);
  ctx.fillStyle = skin.flesh;
  ctx.strokeStyle = skin.dark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(hx, hy, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Sunken sockets with a dim glint and a bloody mouth.
  ctx.fillStyle = '#1a1a14';
  ctx.beginPath();
  ctx.arc(hx - headR * 0.38, hy + headR * 0.15, headR * 0.24, 0, Math.PI * 2);
  ctx.arc(hx + headR * 0.38, hy + headR * 0.15, headR * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = kind === 'stalker' ? PALETTE.stalkerEye : PALETTE.eye;
  ctx.beginPath();
  ctx.arc(hx - headR * 0.38, hy + headR * 0.18, headR * 0.09, 0, Math.PI * 2);
  ctx.arc(hx + headR * 0.38, hy + headR * 0.18, headR * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.blood;
  ctx.fillRect(hx - headR * 0.3, hy + headR * 0.55, headR * 0.6, headR * 0.22);

  if (zombie.flash > 0) {
    ctx.fillStyle = 'rgba(255, 220, 190, 0.3)';
    ctx.beginPath();
    ctx.ellipse(bodyX, y, r * shoulder, r * depth, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (kind === 'brute' || kind === 'bloater') {
    drawHealthBar(ctx, x, y - r - 7, r * 2, zombie.hp / zombie.maxHp);
  }
};

const drawBoss = (ctx: Ctx, boss: Boss): void => {
  const { x, y, r } = boss;
  const pulse = 1 + Math.sin(boss.phase * 2) * 0.04;
  const sway = Math.sin(boss.phase) * 5;

  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(x + 5, y + r * 0.6, r * 1.3, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Massive arms with bone spurs.
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.strokeStyle = PALETTE.bossDark;
    ctx.lineWidth = r * 0.42;
    ctx.beginPath();
    ctx.moveTo(x + side * r * 0.85, y);
    ctx.lineTo(x + side * r * 1.05, y + r * 1.15 + side * sway);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.boss;
    ctx.lineWidth = r * 0.3;
    ctx.stroke();
    ctx.fillStyle = PALETTE.stencil;
    ctx.beginPath();
    ctx.moveTo(x + side * r * 1.0, y + r * 0.4);
    ctx.lineTo(x + side * r * 1.35, y + r * 0.3);
    ctx.lineTo(x + side * r * 1.05, y + r * 0.55);
    ctx.fill();
  }
  ctx.lineCap = 'butt';

  ctx.fillStyle = PALETTE.boss;
  ctx.strokeStyle = PALETTE.bossDark;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.1 * pulse, r * 0.85 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Exposed ribs and open wounds.
  ctx.strokeStyle = PALETTE.bloodDark;
  ctx.lineWidth = 3;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(x + r * 0.35, y + i * r * 0.14, r * 0.3, -0.9, 0.9);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.blood;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.45, y - r * 0.2, r * 0.22, r * 0.14, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Head with glowing eyes.
  const hy = y + r * 0.45;
  ctx.fillStyle = PALETTE.bruteFlesh;
  ctx.strokeStyle = PALETTE.bossDark;
  ctx.beginPath();
  ctx.arc(x, hy, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = PALETTE.bossGlow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = PALETTE.bossGlow;
  ctx.beginPath();
  ctx.arc(x - r * 0.16, hy + r * 0.08, r * 0.07, 0, Math.PI * 2);
  ctx.arc(x + r * 0.16, hy + r * 0.08, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.bloodDark;
  ctx.fillRect(x - r * 0.18, hy + r * 0.22, r * 0.36, r * 0.1);

  if (boss.flash > 0) {
    ctx.fillStyle = 'rgba(255, 235, 210, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.1, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawBossBar = (ctx: Ctx, boss: Boss): void => {
  const x = 40;
  const y = 70;
  const w = WORLD_WIDTH - 80;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x - 3, y - 3, w + 6, 14);
  ctx.fillStyle = PALETTE.bloodDark;
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = PALETTE.gateBad;
  ctx.fillRect(x, y, w * Math.max(0, boss.hp / boss.maxHp), 8);
  ctx.font = `12px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('THE ABOMINATION', WORLD_WIDTH / 2, y + 16);
};

const drawSquad = (ctx: Ctx, game: Game): void => {
  const squad = game.squad;
  const count = game.renderedUnits;
  const r = SQUAD.unitRadius;
  const shooters = Math.min(count, SQUAD.maxShooters);

  // Draw back-to-front so the formation layers nicely.
  const order = game.formation
    .slice(0, count)
    .map((offset, i) => ({ offset, i }))
    .sort((a, b) => a.offset.y - b.offset.y);

  for (const { offset, i } of order) {
    const x = squad.x + offset.x;
    const y = squad.y + offset.y;

    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 2, y + r * 0.6, r * 1.1, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Backpack.
    ctx.fillStyle = PALETTE.soldierDark;
    ctx.fillRect(x - r * 0.6, y + r * 0.2, r * 1.2, r * 0.8);

    // Shoulders.
    ctx.fillStyle = PALETTE.soldier;
    ctx.strokeStyle = PALETTE.soldierDark;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.05, r * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rifle held forward.
    ctx.fillStyle = PALETTE.gun;
    ctx.fillRect(x + r * 0.35, y - r * 1.9, 2.2, r * 1.9);
    ctx.fillStyle = PALETTE.skin;
    ctx.fillRect(x + r * 0.2, y - r * 0.55, 3, 2.5);

    if (squad.muzzle > 0 && i < shooters) {
      const mx = x + r * 0.46;
      const my = y - r * 2.1;
      ctx.fillStyle = 'rgba(255, 170, 60, 0.45)';
      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.muzzle;
      ctx.beginPath();
      ctx.arc(mx, my, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Helmet.
    ctx.fillStyle = PALETTE.helmet;
    ctx.beginPath();
    ctx.arc(x, y - 0.5, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.helmetHighlight;
    ctx.beginPath();
    ctx.arc(x - r * 0.18, y - r * 0.25, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Unit counter.
  const label = String(squad.units);
  const top = squad.y - game.squadRadius - 28;
  ctx.font = `17px ${DISPLAY_FONT}`;
  const width = Math.max(36, ctx.measureText(label).width + 20);
  ctx.fillStyle = 'rgba(10, 10, 8, 0.8)';
  ctx.fillRect(squad.x - width / 2, top - 11, width, 22);
  ctx.strokeStyle = PALETTE.helmetHighlight;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(squad.x - width / 2, top - 11, width, 22);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(label, squad.x, top + 1);
};

const drawBullets = (ctx: Ctx, game: Game): void => {
  ctx.strokeStyle = PALETTE.tracer;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const b of game.bullets) {
    ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.fillStyle = PALETTE.bullet;
  for (const b of game.bullets) ctx.fillRect(b.x - 1, b.y - 3, 2, 5);
};

// --- Effects ----------------------------------------------------------------------------

/** Incendiary ground fires: flickering layered glow. */
const drawFires = (ctx: Ctx, game: Game): void => {
  for (const fire of game.support.fires) {
    const fade = Math.min(1, fire.life / 0.5);
    const flicker = 0.85 + Math.sin(fire.life * 23 + fire.x) * 0.15;
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.ellipse(fire.x, fire.y, fire.r * 1.1, fire.r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.ellipse(fire.x, fire.y, fire.r * 0.7 * flicker, fire.r * 0.45 * flicker, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7 * fade;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(fire.x, fire.y, fire.r * 0.3 * flicker, fire.r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

/** Grenades in flight (with a fake arc) and sniper tracers. */
const drawSupport = (ctx: Ctx, game: Game): void => {
  for (const grenade of game.support.grenades) {
    const t = grenade.t;
    const x = grenade.fromX + (grenade.x - grenade.fromX) * t;
    const y = grenade.fromY + (grenade.y - grenade.fromY) * t;
    const lift = Math.sin(t * Math.PI) * 60;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f4a2a';
    ctx.strokeStyle = '#11140b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y - lift, 3.5 + Math.sin(t * Math.PI) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  for (const tracer of game.support.tracers) {
    ctx.globalAlpha = Math.min(1, tracer.life / 0.14);
    ctx.strokeStyle = '#fff7d6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tracer.x1, tracer.y1);
    ctx.lineTo(tracer.x2, tracer.y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

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
    ctx.font = `${Math.round(t.size * pop)}px ${DISPLAY_FONT}`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
};

// --- Helpers ----------------------------------------------------------------------------

const drawHealthBar = (ctx: Ctx, cx: number, y: number, width: number, ratio: number): void => {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(cx - width / 2 - 1, y - 1, width + 2, 5);
  ctx.fillStyle = PALETTE.gateBad;
  ctx.fillRect(cx - width / 2, y, width * Math.max(0, ratio), 3);
};
