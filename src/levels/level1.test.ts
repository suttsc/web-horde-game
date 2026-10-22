import { describe, expect, it } from 'vitest';
import { level1 } from './level1';

describe('level 1', () => {
  it('keeps its events in chronological order', () => {
    const times = level1.events.map((e) => e.at);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('has exactly one boss', () => {
    expect(level1.events.filter((e) => e.type === 'boss')).toHaveLength(1);
  });

  it('keeps crates on the road', () => {
    for (const event of level1.events) {
      if (event.type !== 'crate') continue;
      expect(event.x).toBeGreaterThan(60);
      expect(event.x).toBeLessThan(300);
    }
  });
});
