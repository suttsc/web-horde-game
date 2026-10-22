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
  main.ts            bootstrap: canvas sizing, game loop, input, overlay
  game/
    Game.ts          simulation (timeline, squad, combat, win/lose)
    render.ts        all canvas drawing (flat vector shapes)
    tuning.ts        every gameplay number lives here
    gates.ts         gate math (pure, unit-tested)
    juice.ts         screen shake, particles, floating text
  levels/
    level1.ts        declarative event timeline for level 1
    level1.balance.test.ts  headless bot playthroughs guarding difficulty
  ui/overlay.ts      Tailwind-styled DOM screens and HUD
```

## Tuning

Balance changes go in `src/game/tuning.ts` (global numbers) and `src/levels/level1.ts` (what spawns
and when). `npm test` runs two headless playthroughs: a bot that picks the better gate must win, and a
player who never moves must lose.

## Deploy

Cloudflare Workers Builds deploys `main` automatically (`npm run build`, then `npx wrangler deploy`).
`wrangler.jsonc` binds the custom domain `horde.suttsc.com`.
