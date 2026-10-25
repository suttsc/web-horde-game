import { describe, expect, it } from 'vitest';
import type { GameStats } from '../game/Game';
import { ProgressStore, type KeyValueStore } from './progress';

const memoryStore = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
};

const ids = [1, 2, 3, 4, 5];
const stats = (time: number, extra: Partial<GameStats> = {}): GameStats => ({
  kills: 50,
  peakUnits: 20,
  time,
  finalUnits: 20,
  badGates: 0,
  bossSeconds: 10,
  ...extra,
});
const ALL: boolean[] = [true, true, true];
const CLEAR_ONLY: boolean[] = [true, false, false];

describe('ProgressStore', () => {
  it('starts with only the first level available', () => {
    const store = new ProgressStore(memoryStore());
    expect(ids.map((id) => store.stateOf(id, ids))).toEqual([
      'available',
      'locked',
      'locked',
      'locked',
      'locked',
    ]);
  });

  it('unlocks the next level on completion and persists it', () => {
    const storage = memoryStore();
    new ProgressStore(storage).complete(1, stats(60), CLEAR_ONLY);

    const reloaded = new ProgressStore(storage);
    expect(reloaded.stateOf(1, ids)).toBe('completed');
    expect(reloaded.stateOf(2, ids)).toBe('available');
    expect(reloaded.stateOf(3, ids)).toBe('locked');
  });

  it('keeps the fastest time and highest counts', () => {
    const store = new ProgressStore(memoryStore());
    expect(store.complete(1, stats(60), CLEAR_ONLY)).toBe(true);
    expect(store.complete(1, stats(70, { kills: 80, peakUnits: 10 }), CLEAR_ONLY)).toBe(false);
    expect(store.snapshot.best[1]).toEqual({
      kills: 80,
      peakUnits: 20,
      time: 60,
      stars: CLEAR_ONLY,
    });
  });

  it('survives corrupt data and missing storage', () => {
    const storage = memoryStore();
    storage.setItem('horde.progress.v1', '{not json');
    expect(new ProgressStore(storage).snapshot.completed).toEqual([]);

    const noStorage = new ProgressStore(null);
    noStorage.complete(1, stats(30), CLEAR_ONLY);
    expect(noStorage.stateOf(2, ids)).toBe('available');
  });

  it('survives storage that throws', () => {
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    const store = new ProgressStore(throwing);
    expect(() => store.complete(1, stats(30), CLEAR_ONLY)).not.toThrow();
    expect(() => store.reset()).not.toThrow();
  });

  it('resets everything', () => {
    const storage = memoryStore();
    const store = new ProgressStore(storage);
    store.complete(1, stats(30), CLEAR_ONLY);
    store.reset();
    expect(store.stateOf(2, ids)).toBe('locked');
    expect(new ProgressStore(storage).snapshot.completed).toEqual([]);
  });

  it('keeps stars earned across runs and totals them', () => {
    const store = new ProgressStore(memoryStore());
    store.complete(1, stats(40), [true, true, false]);
    store.complete(1, stats(50), [true, false, true]);
    store.complete(2, stats(50), CLEAR_ONLY);
    expect(store.snapshot.best[1]?.stars).toEqual(ALL);
    expect(store.totalStars).toBe(4);
  });

  it('upgrades saves from before stars existed', () => {
    const storage = memoryStore();
    storage.setItem(
      'horde.progress.v1',
      JSON.stringify({ completed: [1], best: { 1: { kills: 9, peakUnits: 9, time: 40 } } }),
    );
    expect(new ProgressStore(storage).snapshot.best[1]?.stars).toEqual(CLEAR_ONLY);
  });
});
