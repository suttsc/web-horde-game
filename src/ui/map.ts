import { createRng, range } from '../game/rng';
import type { LevelState } from '../progress/progress';
import type { LevelRecipe } from '../levels/types';

interface Point {
  x: number;
  y: number;
}

interface Stop {
  /** Where the road reaches the town. */
  node: Point;
  /** Centre of the town's postcard. */
  card: Point;
}

const WIDTH = 360;
const HEIGHT = 640;
const CARD_W = 118;
const CARD_H = 62;

/** One stop per level, at the 90° corners of the route. */
const STOPS: readonly Stop[] = [
  { node: { x: 70, y: 548 }, card: { x: 96, y: 482 } },
  { node: { x: 290, y: 428 }, card: { x: 264, y: 362 } },
  { node: { x: 70, y: 308 }, card: { x: 96, y: 242 } },
  { node: { x: 290, y: 188 }, card: { x: 264, y: 122 } },
  { node: { x: 180, y: 84 }, card: { x: 180, y: 36 } },
];

/** Road corners from the bottom of the map to the final city; all turns are 90°. */
const ROUTE: readonly Point[] = [
  { x: 70, y: 660 },
  { x: 70, y: 548 },
  { x: 290, y: 548 },
  { x: 290, y: 428 },
  { x: 70, y: 428 },
  { x: 70, y: 308 },
  { x: 290, y: 308 },
  { x: 290, y: 188 },
  { x: 180, y: 188 },
  { x: 180, y: 84 },
];

/** Index into ROUTE of each stop, so the travelled road can be highlighted. */
const STOP_ROUTE_INDEX = [1, 3, 5, 7, 9];

const FONT = `font-family="'Black Ops One', Impact, sans-serif"`;

export interface MapEntry {
  level: LevelRecipe;
  /** Stars ever earned on this level. */
  stars: readonly boolean[];
  state: LevelState;
}

/** Renders the campaign map as an SVG string. */
export const renderMap = (entries: readonly MapEntry[]): string => {
  const reached = entries.reduce((last, entry, i) => (entry.state !== 'locked' ? i : last), 0);
  const travelled = ROUTE.slice(0, (STOP_ROUTE_INDEX[reached] ?? 1) + 1);

  return `
<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" class="h-full w-full" role="img" aria-label="Evacuation route">
  <defs>
    <pattern id="map-grain" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="#16140f"/>
      <circle cx="1" cy="1" r="0.6" fill="#1f1c15"/>
      <circle cx="4" cy="4" r="0.5" fill="#110f0b"/>
    </pattern>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#map-grain)"/>
  ${terrain()}
  <path d="${pathOf(ROUTE)}" fill="none" stroke="#3d3a32" stroke-width="26" stroke-linejoin="miter"/>
  <path d="${pathOf(ROUTE)}" fill="none" stroke="#26241f" stroke-width="20" stroke-linejoin="miter"/>
  <path d="${pathOf(ROUTE)}" fill="none" stroke="#5c5541" stroke-width="1.5" stroke-dasharray="7 7"/>
  <path d="${pathOf(travelled)}" fill="none" stroke="#d97706" stroke-width="3" stroke-dasharray="10 6" class="map-march"/>
  ${entries.map((entry, i) => stop(entry, i)).join('')}
</svg>`;
};

const pathOf = (points: readonly Point[]): string =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

/** Scattered dead trees and fields so the map isn't empty. */
const terrain = (): string => {
  const rng = createRng(77);
  let out = '';
  for (let i = 0; i < 14; i++) {
    const x = range(rng, 0, WIDTH);
    const y = range(rng, 0, HEIGHT);
    out += `<rect x="${x}" y="${y}" width="${range(rng, 30, 70)}" height="${range(rng, 20, 50)}" fill="#1b1912" transform="rotate(${range(rng, -8, 8)} ${x} ${y})"/>`;
  }
  for (let i = 0; i < 70; i++) {
    out += `<circle cx="${range(rng, 0, WIDTH)}" cy="${range(rng, 0, HEIGHT)}" r="${range(rng, 2, 5)}" fill="${rng() < 0.5 ? '#232a17' : '#1d2214'}"/>`;
  }
  return out;
};

const stop = (entry: MapEntry, index: number): string => {
  const position = STOPS[index];
  if (!position) return '';
  const { level, state, stars } = entry;
  const { node, card } = position;
  const playable = state !== 'locked';
  const earned = stars.filter(Boolean).length;
  const label = `${level.name}, level ${level.id}: ${
    state === 'completed' ? `cleared, ${earned} of 3 stars` : state
  }`;

  return `
<g ${playable ? `role="button" tabindex="0" data-level="${level.id}" class="map-stop cursor-pointer outline-none"` : 'aria-disabled="true"'} aria-label="${label}">
  ${postcard(level, state, card)}
  ${caption(level, state, card, stars)}
  ${marker(level.id, state, node)}
</g>`;
};

/** Town name plus stars (cleared) or a call to action (next) across the top of the postcard. */
const caption = (
  level: LevelRecipe,
  state: LevelState,
  card: Point,
  stars: readonly boolean[],
): string => {
  const x = card.x - CARD_W / 2;
  const y = card.y - CARD_H / 2;
  const right =
    state === 'completed'
      ? `<text x="${x + CARD_W - 5}" y="${y + 12}" text-anchor="end" font-family="system-ui, sans-serif" font-size="10" letter-spacing="0.5">${[
          0, 1, 2,
        ]
          .map((i) => `<tspan fill="${stars[i] ? '#fbbf24' : '#44403c'}">★</tspan>`)
          .join('')}</text>`
      : state === 'available'
        ? `<text x="${x + CARD_W - 5}" y="${y + 11}" text-anchor="end" font-family="system-ui, sans-serif" font-size="6.5" font-weight="800" letter-spacing="0.6" fill="#f59e0b">DEPLOY</text>`
        : '';
  return `
<rect x="${x + 1}" y="${y + 1}" width="${CARD_W - 2}" height="15" rx="3" fill="#0c0a09" opacity="0.72"/>
<text x="${x + 5}" y="${y + 11.5}" ${FONT} font-size="9.5" fill="${state === 'locked' ? '#78716c' : '#ede6d3'}">${level.name.toUpperCase()}</text>
${right}`;
};

const marker = (id: number, state: LevelState, node: Point): string => {
  const fill = state === 'completed' ? '#3f6212' : state === 'available' ? '#b45309' : '#292524';
  const ring = state === 'completed' ? '#84cc16' : state === 'available' ? '#fbbf24' : '#44403c';
  const pulse =
    state === 'available'
      ? `<circle cx="${node.x}" cy="${node.y}" r="15" fill="none" stroke="#fbbf24" stroke-width="2" class="map-pulse"/>`
      : '';
  const glyph =
    state === 'completed'
      ? `<path d="M${node.x - 6} ${node.y} l4 4 l8 -9" fill="none" stroke="#ecfccb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
      : state === 'locked'
        ? `<rect x="${node.x - 5}" y="${node.y - 1}" width="10" height="8" rx="1.5" fill="#78716c"/><path d="M${node.x - 3} ${node.y - 1} v-3 a3 3 0 0 1 6 0 v3" fill="none" stroke="#78716c" stroke-width="2"/>`
        : `<text x="${node.x}" y="${node.y + 5}" text-anchor="middle" ${FONT} font-size="14" fill="#fffbeb">${id}</text>`;
  return `${pulse}<circle cx="${node.x}" cy="${node.y}" r="13" fill="${fill}" stroke="${ring}" stroke-width="2.5"/>${glyph}`;
};

/** A little skyline picture of the town; its mood reflects the level state. */
const postcard = (level: LevelRecipe, state: LevelState, centre: Point): string => {
  const x = centre.x - CARD_W / 2;
  const y = centre.y - CARD_H / 2;
  const clip = `card-${level.id}`;
  const sky =
    state === 'completed'
      ? ['#f59e0b', '#7c2d12']
      : state === 'available'
        ? ['#7f1d1d', '#1c0a0a']
        : ['#3a3633', '#1c1917'];
  const big = level.id === 5;
  // Seeded by level id so each town keeps the same skyline.
  const rng = createRng(level.id * 101);
  const ground = y + CARD_H - 8;

  let buildings = '';
  let windows = '';
  let cursor = x + 2;
  while (cursor < x + CARD_W - 6) {
    const w = range(rng, big ? 9 : 10, big ? 16 : 20);
    const h = range(rng, big ? 22 : 12, big ? 48 : 30);
    const top = ground - h;
    const shade = state === 'locked' ? '#100f0d' : rng() < 0.5 ? '#1f1b16' : '#2a241d';
    buildings += `<rect x="${cursor}" y="${top}" width="${w}" height="${h}" fill="${shade}"/>`;
    if (rng() < 0.35)
      buildings += `<rect x="${cursor + w / 2 - 1}" y="${top - 5}" width="2" height="5" fill="${shade}"/>`;
    for (let wy = top + 3; wy < ground - 3; wy += 5) {
      for (let wx = cursor + 2; wx < cursor + w - 2; wx += 4) {
        const lit =
          state === 'completed' ? rng() < 0.6 : state === 'available' ? rng() < 0.12 : false;
        if (lit) windows += `<rect x="${wx}" y="${wy}" width="1.6" height="2" fill="#fde68a"/>`;
      }
    }
    cursor += w + range(rng, 0, 3);
  }

  const smoke =
    state === 'available'
      ? `<circle cx="${x + CARD_W * 0.7}" cy="${y + 16}" r="9" fill="#1c1917" opacity="0.7"/><circle cx="${x + CARD_W * 0.78}" cy="${y + 9}" r="7" fill="#1c1917" opacity="0.5"/><circle cx="${x + CARD_W * 0.66}" cy="${ground - 18}" r="3" fill="#ea580c" opacity="0.9"/>`
      : '';
  const stamp =
    state === 'completed'
      ? `<g transform="rotate(-12 ${x + CARD_W - 26} ${y + 32})"><rect x="${x + CARD_W - 50}" y="${y + 25}" width="44" height="14" rx="2" fill="#0c0a09" fill-opacity="0.4" stroke="#84cc16" stroke-width="1.6"/><text x="${x + CARD_W - 28}" y="${y + 36}" text-anchor="middle" ${FONT} font-size="9" fill="#84cc16">SAFE</text></g>`
      : '';
  const veil =
    state === 'locked'
      ? `<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" fill="#0c0a09" opacity="0.2"/>`
      : '';

  return `
<defs>
  <clipPath id="${clip}"><rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="4"/></clipPath>
  <linearGradient id="${clip}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[0]}"/></linearGradient>
</defs>
<rect x="${x + 3}" y="${y + 4}" width="${CARD_W}" height="${CARD_H}" rx="4" fill="#000" opacity="0.5"/>
<g clip-path="url(#${clip})">
  <rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" fill="url(#${clip}-sky)"/>
  ${smoke}${buildings}${windows}
  <rect x="${x}" y="${ground}" width="${CARD_W}" height="8" fill="#0f0d0a"/>
  ${veil}
</g>
<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="4" fill="none" stroke="${state === 'available' ? '#f59e0b' : '#44403c'}" stroke-width="${state === 'available' ? 2 : 1.5}" class="map-card"/>
${stamp}`;
};
