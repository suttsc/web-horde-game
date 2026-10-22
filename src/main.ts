import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { Game } from './game/Game';
import { DragInput } from './game/input';
import { render, type Viewport } from './game/render';
import { MAX_VIEW_HEIGHT, MIN_VIEW_HEIGHT, WORLD_WIDTH } from './game/tuning';
import { level1 } from './levels/level1';
import { Overlay } from './ui/overlay';

const FIXED_STEP = 1 / 120;
const MAX_FRAME = 0.1;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const context = canvas.getContext('2d', { alpha: false });
if (!context) throw new Error('Canvas 2D is not supported');
const ctx: CanvasRenderingContext2D = context;

const overlay = new Overlay(() => game.start());
const game = new Game(level1, {
  onStatus: (status, stats) => overlay.showStatus(status, stats),
  onBanner: (text) => overlay.showBanner(text),
});

/** CSS pixels per virtual pixel, plus device-pixel transform for the renderer. */
let cssScale = 1;
const viewport: Viewport = { ratio: 1, offsetX: 0 };

const resize = (): void => {
  const { width, height } = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  // Fit the 360-wide world to the width, unless that makes the view too tall or too short.
  cssScale = width / WORLD_WIDTH;
  const viewHeight = height / cssScale;
  if (viewHeight > MAX_VIEW_HEIGHT) cssScale = height / MAX_VIEW_HEIGHT;
  if (viewHeight < MIN_VIEW_HEIGHT) cssScale = height / MIN_VIEW_HEIGHT;

  game.setViewHeight(height / cssScale);
  viewport.ratio = cssScale * dpr;
  viewport.offsetX = ((width - WORLD_WIDTH * cssScale) / 2) * dpr;
};

const input = new DragInput(canvas, () => cssScale);
new ResizeObserver(resize).observe(canvas);
resize();

let last = performance.now();
let accumulator = 0;

const frame = (now: number): void => {
  accumulator += Math.min((now - last) / 1000, MAX_FRAME);
  last = now;

  const steer = input.consumeDrag();
  let firstStep = true;
  while (accumulator >= FIXED_STEP) {
    game.update(FIXED_STEP, firstStep ? steer : 0, input.keyAxis());
    firstStep = false;
    accumulator -= FIXED_STEP;
  }

  render(ctx, game, viewport);
  overlay.updateHud(game.progress, game.stats.kills);
  requestAnimationFrame(frame);
};

overlay.showStatus(game.status, game.stats);
requestAnimationFrame(frame);

registerSW({ immediate: true });
