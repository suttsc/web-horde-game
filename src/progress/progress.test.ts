import { describe, expect, it } from 'vitest';
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
const stats = (time: number) => ({ kills: 50, peakUnits: 20, time });

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
    new ProgressStore(storage).complete(1, stats(60));

    const reloaded = new ProgressStore(storage);
    expect(reloaded.stateOf(1, ids)).toBe('completed');
    expect(reloaded.stateOf(2, ids)).toBe('available');
    expect(reloaded.stateOf(3, ids)).toBe('locked');
  });

  it('keeps the fastest time and highest counts', () => {
    const store = new ProgressStore(memoryStore());
    expect(store.complete(1, stats(60))).toBe(true);
    expect(store.complete(1, { kills: 80, peakUnits: 10, time: 70 })).toBe(false);
    expect(store.snapshot.best[1]).toEqual({ kills: 80, peakUnits: 20, time: 60 });
  });

  it('survives corrupt data and missing storage', () => {
    const storage = memoryStore();
    storage.setItem('horde.progress.v1', '{not json');
    expect(new ProgressStore(storage).snapshot.completed).toEqual([]);

    const noStorage = new ProgressStore(null);
    noStorage.complete(1, stats(30));
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
    expect(() => store.complete(1, stats(30))).not.toThrow();
    expect(() => store.reset()).not.toThrow();
  });

  it('resets everything', () => {
    const storage = memoryStore();
    const store = new ProgressStore(storage);
    store.complete(1, stats(30));
    store.reset();
    expect(store.stateOf(2, ids)).toBe('locked');
    expect(new ProgressStore(storage).snapshot.completed).toEqual([]);
  });
});
