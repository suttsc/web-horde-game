# Horde: Last Stand

A mobile-first 2D horde shooter (PWA). Drag your squad left and right, shoot gates to grow it,
break crates for upgrades, and survive the zombie horde and the boss at the end of the level.

Live at **https://horde.suttsc.com** (Cloudflare Workers static assets).

## Stack

- Vite + TypeScript (strict) + Canvas 2D: hand-written fixed-step loop, no engine
- Tailwind CSS v4 for the DOM overlay (menus, HUD, banners)
- vite-plugin-pwa for install and offline play
- Vitest, ESLint, Prettier

## Scripts

```bash
npm run dev       # dev server (exposed on LAN so you can open it on your phone)
npm test          # unit + balance tests
npm run lint
npm run build     # typecheck + production build to dist/
npm run deploy    # build + wrangler deploy
```

## Layout

```
src/
  main.ts            bootstrap: canvas sizing, game loop, input, screen flow
  game/
    Game.ts          simulation (timeline, stream, squad, combat, win/lose)
    render.ts        all canvas drawing
    tuning.ts        every global gameplay number lives here
    gates.ts         gate math (pure, unit-tested)
    juice.ts         screen shake, particles, floating text
  levels/
    level1..5.ts     declarative timelines: Pinewood, Millbrook, Ashford, Redfield, Ground Zero
    index.ts         campaign order
    balance.test.ts  headless bot playthroughs of every level
  progress/          campaign progress saved to localStorage (fails soft)
  ui/
    overlay.ts       Tailwind-styled DOM screens and HUD
    map.ts           SVG campaign map: the evacuation route and town postcards
```

## Campaign

Five towns along one road, each unlocking the next. Progress and best times are stored per device
under the `horde.progress.v1` localStorage key; "Reset progress" on the map clears it.

| #   | Town        | Introduces                        |
| --- | ----------- | --------------------------------- |
| 1   | Pinewood    | walkers, gates, crates (tutorial) |
| 2   | Millbrook   | runners, first bloaters           |
| 3   | Ashford     | stalkers, first brutes            |
| 4   | Redfield    | everything, slightly toned down   |
| 5   | Ground Zero | everything, full pressure         |

## Tuning

Balance changes go in `src/game/tuning.ts` (global numbers) and `src/levels/levelN.ts` (what spawns
and when). `npm test` plays every level headlessly: a bot that aims at the nearest zombie, picks the
better gate and lines up on crates must win each one, and from level 2 on a player who never moves
must lose (from level 3, within 40 seconds).

## Deploy

Cloudflare Workers Builds deploys `main` automatically (`npm run build`, then `npx wrangler deploy`).
`wrangler.jsonc` binds the custom domain `horde.suttsc.com`.
