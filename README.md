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
    perks.ts         upgrade definitions and the random 1-of-3 roll
    support.ts       perk-driven support fire: grenades, fires, sniper
    render.ts        all canvas drawing
    tuning.ts        every global gameplay number lives here
    gates.ts         gate math (pure, unit-tested)
    juice.ts         screen shake, particles, floating text
  levels/
    campaign.ts      the five level recipes
    generate.ts      seeded generator: recipe + seed -> concrete level
    stars.ts         star goals and scoring
  progress/          campaign progress and stars saved to localStorage (fails soft)
  testing/bot.ts     headless bot used by the balance tests
  ui/
    overlay.ts       Tailwind-styled DOM screens, HUD and upgrade picks
    map.ts           SVG campaign map: the evacuation route and town postcards
```

## How a run works

- **Generated levels.** Each town is a _recipe_ (length, waves, enemy mix, stream and horde ramps,
  gate generosity, boss). Every attempt, retries included, generates a fresh layout from a random
  seed: gate values and sides, crate rewards and lanes, horde timing, packs and positions all vary.
- **Gates.** Bullets pass through gates, charging each gate once on the way, so pumping a gate
  costs you positioning, not firepower.
- **Upgrades.** Before every wave after the first, and again before the boss, the game pauses for a
  pick of 1 from 3 random perks (piercing, incendiary, medic, grenadier, overwatch, scavenger, body
  armour, fire rate, damage, reinforcements). Most stack.
- **Stars.** Each town has three: clear it, finish with enough soldiers, and a town-specific
  challenge (no red gates, a kill count, or a fast boss kill). Stars are kept once earned and shown
  on the map.

| #   | Town        | Introduces                        | Third star               |
| --- | ----------- | --------------------------------- | ------------------------ |
| 1   | Pinewood    | walkers, gates, crates (tutorial) | Never take a red gate    |
| 2   | Millbrook   | runners, first bloaters           | Kill 150 zombies         |
| 3   | Ashford     | stalkers, first brutes            | Kill the boss within 10s |
| 4   | Redfield    | everything, slightly toned down   | Never take a red gate    |
| 5   | Ground Zero | everything, full pressure         | Kill the boss within 15s |

## Tuning

Global numbers live in `src/game/tuning.ts` (including perk strength), level shape in
`src/levels/campaign.ts`, and layout rules in `src/levels/generate.ts`. `npm test` plays every level
on 12 seeds with a bot that aims, picks the better gate, takes crates and focuses the boss. It must
win at least 90% of level 1 down to 50% of level 5, and a player who never moves must lose at least
80% of runs from level 2 on.

## Deploy

Cloudflare Workers Builds deploys `main` automatically (`npm run build`, then `npx wrangler deploy`).
`wrangler.jsonc` binds the custom domain `horde.suttsc.com`.
