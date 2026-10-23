import { describe, expect, it } from 'vitest';
import { LEVELS, findLevel } from './index';

describe('campaign', () => {
  it('numbers levels 1..n in order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(LEVELS.map((_, i) => i + 1));
    expect(findLevel(3)?.name).toBe(LEVELS[2]?.name);
  });

  it('gets longer and tougher towards the end', () => {
    const bossTimes = LEVELS.map((l) => l.events.find((e) => e.type === 'boss')?.at ?? 0);
    const bossHp = LEVELS.map((l) => {
      const boss = l.events.find((e) => e.type === 'boss');
      return boss?.type === 'boss' ? boss.hp : 0;
    });
    expect(bossTimes).toEqual([...bossTimes].sort((a, b) => a - b));
    expect(bossHp).toEqual([...bossHp].sort((a, b) => a - b));
  });
});

describe.each(LEVELS.map((level) => [level.id, level] as const))('level %i data', (_, level) => {
  it('keeps its events in chronological order', () => {
    const times = level.events.map((e) => e.at);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('has exactly one boss', () => {
    expect(level.events.filter((e) => e.type === 'boss')).toHaveLength(1);
  });

  it('keeps crates on the road', () => {
    for (const event of level.events) {
      if (event.type !== 'crate') continue;
      expect(event.x).toBeGreaterThan(60);
      expect(event.x).toBeLessThan(300);
    }
  });

  it('has non-overlapping stream phases', () => {
    level.stream.forEach((phase, i) => {
      expect(phase.to).toBeGreaterThan(phase.from);
      const next = level.stream[i + 1];
      if (next) expect(next.from).toBeGreaterThanOrEqual(phase.to);
    });
  });
});
