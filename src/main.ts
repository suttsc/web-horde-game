import '@fontsource/black-ops-one/latin-400.css';
import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { Game } from './game/Game';
import { DragInput } from './game/input';
import { DISPLAY_FONT, render, type Viewport } from './game/render';
import { MAX_VIEW_HEIGHT, MIN_VIEW_HEIGHT, WORLD_WIDTH } from './game/tuning';
import { LEVELS, findLevel, randomSeed } from './levels';
import { generateLevel } from './levels/generate';
import { earnStars, starGoals } from './levels/stars';
import type { LevelRecipe } from './levels/types';
import { ProgressStore, STARS_PER_LEVEL, browserStorage } from './progress/progress';
import { Overlay } from './ui/overlay';

const FIXED_STEP = 1 / 60;
const MAX_FRAME = 0.1;
const LEVEL_IDS = LEVELS.map((level) => level.id);

const canvas = document.getElementById('game') as HTMLCanvasElement;
const context = canvas.getContext('2d', { alpha: false });
if (!context) throw new Error('Canvas 2D is not supported');
const ctx: CanvasRenderingContext2D = context;

const progress = new ProgressStore(browserStorage());
let currentLevel: LevelRecipe = LEVELS[0] as LevelRecipe;

const openMap = (): void =>
  overlay.showMap(
    LEVELS.map((level) => ({
      level,
      state: progress.stateOf(level.id, LEVEL_IDS),
      stars: progress.snapshot.best[level.id]?.stars ?? Array<boolean>(STARS_PER_LEVEL).fill(false),
    })),
    progress.totalStars,
  );

/** Every attempt, retries included, gets a freshly generated layout. */
const play = (level: LevelRecipe): void => {
  if (progress.stateOf(level.id, LEVEL_IDS) === 'locked') return;
  currentLevel = level;
  overlay.setLevel(level);
  overlay.updatePerks({});
  game.start(generateLevel(level, randomSeed()));
};

const overlay = new Overlay({
  onSelectLevel: (id) => {
    const level = findLevel(id);
    if (level) play(level);
  },
  onSelectPerk: (perk) => {
    game.choosePerk(perk);
    overlay.hidePerks();
    overlay.updatePerks(game.perks);
  },
  onAction: (action) => {
    switch (action) {
      case 'map':
        openMap();
        break;
      case 'retry':
        play(currentLevel);
        break;
      case 'next': {
        const next = LEVELS[LEVELS.indexOf(currentLevel) + 1];
        if (next) play(next);
        else openMap();
        break;
      }
      case 'reset':
        if (window.confirm('Reset all progress? Every town will be locked again.')) {
          progress.reset();
          openMap();
        }
        break;
    }
  },
});

const game = new Game(generateLevel(currentLevel, randomSeed()), {
  onStatus: (status, stats) => {
    if (status === 'playing') {
      overlay.showScreen('playing');
      return;
    }
    if (status !== 'won' && status !== 'lost') return;

    const won = status === 'won';
    const stars = earnStars(currentLevel, stats, won);
    const newBest = won ? progress.complete(currentLevel.id, stats, stars) : false;
    const goals = starGoals(currentLevel);
    overlay.showResult({
      won,
      level: currentLevel,
      stats,
      hasNext: LEVELS.indexOf(currentLevel) < LEVELS.length - 1,
      newBest,
      stars: goals.map((goal, i) => ({ goal, earned: stars[i] ?? false })),
    });
  },
  onPerkChoice: (choices, stacks, wave) =>
    overlay.showPerks(
      choices,
      stacks,
      wave > currentLevel.waves ? 'The boss is coming' : `Wave ${wave} incoming`,
    ),
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

overlay.showScreen('title');
requestAnimationFrame(frame);

// Canvas text doesn't trigger webfont loading on its own.
void document.fonts.load(`20px ${DISPLAY_FONT}`);

registerSW({ immediate: true });
