import type { GameStats } from '../game/Game';
import { PERKS, type PerkId, type PerkStacks } from '../game/perks';
import type { LevelRecipe } from '../levels/types';
import { renderMap, type MapEntry } from './map';

export type Screen = 'title' | 'map' | 'playing' | 'end';

export type OverlayAction = 'map' | 'retry' | 'next' | 'reset';

export interface OverlayHandlers {
  onAction: (action: OverlayAction) => void;
  onSelectLevel: (levelId: number) => void;
  onSelectPerk: (perk: PerkId) => void;
}

export interface Result {
  won: boolean;
  level: LevelRecipe;
  stats: GameStats;
  hasNext: boolean;
  newBest: boolean;
  /** Goal text and whether this run earned each star. */
  stars: { goal: string; earned: boolean }[];
}

/** Ignore taps on fresh perk cards briefly, so a drag in progress can't pick one by accident. */
const PERK_ARM_DELAY_MS = 450;

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
};

/** Thin DOM layer (Tailwind-styled) for menus, the campaign map, HUD and banners. */
export class Overlay {
  private readonly screens: Record<Exclude<Screen, 'playing'>, HTMLElement> = {
    title: byId('screen-start'),
    map: byId('screen-map'),
    end: byId('screen-end'),
  };
  private readonly hud = byId('hud');
  private readonly hudLevel = byId('hud-level');
  private readonly progress = byId('hud-progress');
  private readonly kills = byId('hud-kills');
  private readonly banner = byId('banner');
  private readonly mapBoard = byId('map-board');
  private readonly endPrimary = byId<HTMLButtonElement>('end-primary');
  private readonly perkScreen = byId('screen-perk');
  private readonly perkOptions = byId('perk-options');
  private readonly hudPerks = byId('hud-perks');
  private lastKills = -1;
  private lastProgress = -1;

  constructor(private readonly handlers: OverlayHandlers) {
    document.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      const action = target?.closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action) {
        event.stopPropagation();
        this.handlers.onAction(action as OverlayAction);
        return;
      }
      const perk = target?.closest<HTMLButtonElement>('[data-perk]');
      if (perk && !perk.disabled) {
        this.handlers.onSelectPerk(perk.dataset.perk as PerkId);
        return;
      }
      this.selectFrom(target);
    });
    this.mapBoard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.selectFrom(event.target as Element | null);
      }
    });
  }

  showScreen(screen: Screen): void {
    for (const [name, element] of Object.entries(this.screens)) {
      const visible = name === screen;
      element.classList.toggle('hidden', !visible);
      element.classList.toggle('flex', visible);
    }
    this.hud.classList.toggle('hidden', screen !== 'playing');
  }

  showMap(entries: readonly MapEntry[], totalStars: number): void {
    this.mapBoard.innerHTML = renderMap(entries);
    const cleared = entries.filter((e) => e.state === 'completed').length;
    byId('map-progress').textContent =
      `${cleared}/${entries.length} safe · ${totalStars}/${entries.length * 3} ★`;
    const next = entries.find((e) => e.state === 'available');
    byId('map-briefing').textContent = next
      ? `${next.level.name}: ${next.level.blurb}`
      : 'Every town is safe. Replay any of them to beat your times.';
    this.showScreen('map');
  }

  setLevel(level: LevelRecipe): void {
    this.hudLevel.textContent = `LVL ${level.id}`;
  }

  showPerks(choices: readonly PerkId[], stacks: Readonly<PerkStacks>, heading: string): void {
    byId('perk-heading').textContent = heading;
    this.perkOptions.innerHTML = choices
      .map((id) => {
        const perk = PERKS[id];
        const next = (stacks[id] ?? 0) + 1;
        const level = perk.maxStacks > 1 && perk.maxStacks < 99 ? `Lv ${next}` : '';
        return `
<button data-perk="${id}" disabled
  class="pointer-events-auto flex items-center gap-4 border-2 border-stone-700 bg-stone-900/95 p-3.5 text-left transition enabled:hover:border-amber-500 enabled:active:scale-[0.98] disabled:opacity-60">
  <span class="grid size-12 shrink-0 place-items-center border border-amber-700/60 bg-black/60 font-display text-xs text-amber-500">${perk.tag}</span>
  <span class="min-w-0">
    <span class="block font-display text-lg leading-tight text-stone-100 uppercase">${perk.name}
      <span class="ml-1 align-middle text-[10px] tracking-widest text-stone-500">${level}</span></span>
    <span class="block text-sm leading-snug text-stone-400">${perk.describe(next)}</span>
  </span>
</button>`;
      })
      .join('');
    this.perkScreen.classList.replace('hidden', 'flex');
    window.setTimeout(() => {
      this.perkOptions
        .querySelectorAll<HTMLButtonElement>('[data-perk]')
        .forEach((button) => (button.disabled = false));
    }, PERK_ARM_DELAY_MS);
  }

  hidePerks(): void {
    this.perkScreen.classList.replace('flex', 'hidden');
  }

  /** Small tags under the HUD bar for the perks taken this run. */
  updatePerks(stacks: Readonly<PerkStacks>): void {
    this.hudPerks.innerHTML = (Object.entries(stacks) as [PerkId, number][])
      .map(
        ([id, count]) =>
          `<span class="border border-stone-700/70 bg-black/60 px-1.5 py-0.5 font-display text-[9px] tracking-wider text-amber-500">${PERKS[id].tag}${count > 1 ? `<span class="text-stone-400"> ×${count}</span>` : ''}</span>`,
      )
      .join('');
  }

  showResult({ won, level, stats, hasNext, newBest, stars }: Result): void {
    this.hidePerks();
    const title = byId('end-title');
    title.textContent = won ? `${level.name} safe` : 'Overrun';
    title.className = `font-display text-5xl uppercase ${won ? 'text-amber-500' : 'text-red-700'}`;
    byId('end-subtitle').textContent = won
      ? hasNext
        ? `The road ahead is open.${newBest ? ' New best time!' : ''}`
        : 'Ground Zero has fallen silent. Every town is safe.'
      : `The horde broke through at ${level.name}. Grow the squad faster and keep moving.`;
    byId('stat-kills').textContent = String(stats.kills);
    byId('stat-peak').textContent = String(stats.peakUnits);
    byId('stat-time').textContent = `${Math.round(stats.time)}s`;
    byId('end-stars').innerHTML = stars
      .map(
        ({ goal, earned }) =>
          `<li class="flex items-center gap-2 ${earned ? 'text-stone-200' : 'text-stone-600'}"><span class="text-lg leading-none ${earned ? 'text-amber-400' : 'text-stone-700'}">★</span>${goal}</li>`,
      )
      .join('');

    const primary: OverlayAction = won ? (hasNext ? 'next' : 'map') : 'retry';
    this.endPrimary.dataset.action = primary;
    this.endPrimary.textContent = { next: 'Next town', retry: 'Retry', map: 'Map', reset: '' }[
      primary
    ];
    byId('end-secondary').classList.toggle('hidden', primary === 'map');
    this.showScreen('end');
  }

  showBanner(text: string): void {
    this.banner.textContent = text;
    this.banner.classList.toggle('text-red-600', text === 'BOSS');
    this.banner.classList.remove('animate-banner');
    void this.banner.offsetWidth; // restart the animation
    this.banner.classList.add('animate-banner');
  }

  updateHud(progress: number, kills: number): void {
    const rounded = Math.round(progress * 100);
    if (rounded !== this.lastProgress) {
      this.progress.style.width = `${rounded}%`;
      this.lastProgress = rounded;
    }
    if (kills !== this.lastKills) {
      this.kills.textContent = String(kills);
      this.lastKills = kills;
    }
  }

  private selectFrom(target: Element | null): void {
    const id = target?.closest<SVGElement>('[data-level]')?.dataset.level;
    if (id) this.handlers.onSelectLevel(Number(id));
  }
}
