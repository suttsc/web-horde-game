import type { GameStats, GameStatus } from '../game/Game';

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
};

/** Thin DOM layer (Tailwind-styled) for menus, HUD and banners. */
export class Overlay {
  private readonly hud = byId('hud');
  private readonly progress = byId('hud-progress');
  private readonly kills = byId('hud-kills');
  private readonly banner = byId('banner');
  private readonly startScreen = byId('screen-start');
  private readonly endScreen = byId('screen-end');
  private lastKills = -1;
  private lastProgress = -1;

  constructor(onStart: () => void) {
    document.querySelectorAll<HTMLButtonElement>('[data-action="start"]').forEach((button) =>
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        onStart();
      }),
    );
  }

  showStatus(status: GameStatus, stats: GameStats): void {
    toggle(this.startScreen, status === 'menu');
    toggle(this.endScreen, status === 'won' || status === 'lost');
    toggle(this.hud, status === 'playing');

    if (status === 'won' || status === 'lost') {
      const won = status === 'won';
      const title = byId('end-title');
      title.textContent = won ? 'Survived!' : 'Overrun';
      title.className = `font-display text-6xl uppercase ${won ? 'text-amber-500' : 'text-red-700'}`;
      byId('end-subtitle').textContent = won
        ? 'The abomination is down. The road is yours, for now.'
        : 'The horde broke through. Grow the squad faster and keep moving.';
      byId('stat-kills').textContent = String(stats.kills);
      byId('stat-peak').textContent = String(stats.peakUnits);
      byId('stat-time').textContent = `${Math.round(stats.time)}s`;
    }
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
}

const toggle = (element: HTMLElement, visible: boolean): void => {
  element.classList.toggle('hidden', !visible);
  element.classList.toggle('flex', visible && element.tagName === 'SECTION');
};
