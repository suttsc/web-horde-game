import { describe, expect, it } from 'vitest';
import { formationOffsets, formationRadius } from './formation';

describe('formation', () => {
  it('places the first soldier at the centre', () => {
    const [first] = formationOffsets(5, 10);
    expect(first).toEqual({ x: 0, y: 0 });
  });

  it('keeps every soldier within the formation radius', () => {
    const offsets = formationOffsets(40, 8);
    const radius = formationRadius(40, 8, 0);
    for (const { x, y } of offsets) {
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(radius + 1e-9);
    }
  });

  it('a lone soldier has the radius of one unit', () => {
    expect(formationRadius(1, 8, 6)).toBe(6);
  });
});
