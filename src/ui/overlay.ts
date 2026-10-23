import type { GameStats } from '../game/Game';
import type { LevelDefinition } from '../levels/types';
import type { Progress } from '../progress/progress';
import { renderMap, type MapEntry } from './map';

export type Screen = 'title' | 'map' | 'playing' | 'end';

export type OverlayAction = 'map' | 'retry' | 'next' | 'reset';

export interface OverlayHandlers {
  onAction: (action: OverlayAction) => void;
  onSelectLevel: (levelId: number) => void;
}

export interface Result {
  won: boolean;
  level: LevelDefinition;
  stats: GameStats;
  hasNext: boolean;
  newBest: boolean;
}

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

  showMap(entries: readonly MapEntry[], progress: Readonly<Progress>): void {
    this.mapBoard.innerHTML = renderMap(entries, progress);
    const cleared = entries.filter((e) => e.state === 'completed').length;
    byId('map-progress').textContent = `${cleared} / ${entries.length} towns safe`;
    const next = entries.find((e) => e.state === 'available');
    byId('map-briefing').textContent = next
      ? `${next.level.name}: ${next.level.blurb}`
      : 'Every town is safe. Replay any of them to beat your times.';
    this.showScreen('map');
  }

  setLevel(level: LevelDefinition): void {
    this.hudLevel.textContent = `LVL ${level.id}`;
  }

  showResult({ won, level, stats, hasNext, newBest }: Result): void {
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
