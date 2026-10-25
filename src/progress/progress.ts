import type { GameStats } from '../game/Game';

export const STARS_PER_LEVEL = 3;

export interface LevelRecord {
  kills: number;
  peakUnits: number;
  /** Fastest clear, in seconds. */
  time: number;
  /** Stars ever earned on this level; once earned, a star is kept. */
  stars: boolean[];
}

export interface Progress {
  /** Ids of levels cleared at least once. */
  completed: number[];
  best: Record<number, LevelRecord>;
}

export type LevelState = 'completed' | 'available' | 'locked';

/** The subset of Web Storage we need, so tests can pass an in-memory fake. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const STORAGE_KEY = 'horde.progress.v1';

const empty = (): Progress => ({ completed: [], best: {} });

/** Campaign progress persisted per device. Storage failures never break the game. */
export class ProgressStore {
  private progress: Progress;

  constructor(private readonly storage: KeyValueStore | null) {
    this.progress = this.load();
  }

  get snapshot(): Readonly<Progress> {
    return this.progress;
  }

  /** Level ids in campaign order unlock one at a time. */
  stateOf(levelId: number, orderedIds: readonly number[]): LevelState {
    if (this.progress.completed.includes(levelId)) return 'completed';
    const index = orderedIds.indexOf(levelId);
    const previous = orderedIds[index - 1];
    return index === 0 || (previous !== undefined && this.progress.completed.includes(previous))
      ? 'available'
      : 'locked';
  }

  get totalStars(): number {
    return Object.values(this.progress.best).reduce(
      (sum, record) => sum + record.stars.filter(Boolean).length,
      0,
    );
  }

  /** Records a clear and returns whether it set a new best time. */
  complete(levelId: number, stats: GameStats, stars: readonly boolean[]): boolean {
    if (!this.progress.completed.includes(levelId)) this.progress.completed.push(levelId);

    const previous = this.progress.best[levelId];
    const isBest = !previous || stats.time < previous.time;
    this.progress.best[levelId] = {
      kills: Math.max(previous?.kills ?? 0, stats.kills),
      peakUnits: Math.max(previous?.peakUnits ?? 0, stats.peakUnits),
      time: isBest ? stats.time : (previous?.time ?? stats.time),
      stars: Array.from(
        { length: STARS_PER_LEVEL },
        (_, i) => Boolean(previous?.stars[i]) || Boolean(stars[i]),
      ),
    };
    this.save();
    return isBest;
  }

  reset(): void {
    this.progress = empty();
    try {
      this.storage?.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable: progress simply lives in memory this session.
    }
  }

  private load(): Progress {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (!raw) return empty();
      const parsed = JSON.parse(raw) as Partial<Progress>;
      return {
        completed: Array.isArray(parsed.completed)
          ? parsed.completed.filter((id): id is number => typeof id === 'number')
          : [],
        best: normaliseBest(parsed.best),
      };
    } catch {
      return empty();
    }
  }

  private save(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch {
      // Storage unavailable or full: keep playing without persistence.
    }
  }
}

/** Fills in fields added after a record was saved (older saves have no stars). */
const normaliseBest = (best: unknown): Record<number, LevelRecord> => {
  if (!best || typeof best !== 'object') return {};
  const records: Record<number, LevelRecord> = {};
  for (const [id, value] of Object.entries(best as Record<string, Partial<LevelRecord>>)) {
    if (!value || typeof value !== 'object') continue;
    records[Number(id)] = {
      kills: value.kills ?? 0,
      peakUnits: value.peakUnits ?? 0,
      time: value.time ?? 0,
      // A record exists only for cleared levels, so the first star is always earned.
      stars: Array.from({ length: STARS_PER_LEVEL }, (_, i) =>
        i === 0 ? true : Boolean(value.stars?.[i]),
      ),
    };
  }
  return records;
};

/** Resolves localStorage defensively (it can throw in private mode). */
export const browserStorage = (): KeyValueStore | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
