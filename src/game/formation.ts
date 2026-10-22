import type { Vec2 } from './types';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Sunflower (phyllotaxis) packing: a tight, organic-looking blob of soldiers. */
export const formationOffsets = (count: number, spacing: number): Vec2[] =>
  Array.from({ length: count }, (_, i) => {
    const radius = spacing * Math.sqrt(i);
    const angle = i * GOLDEN_ANGLE;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });

export const formationRadius = (count: number, spacing: number, unitRadius: number): number =>
  spacing * Math.sqrt(Math.max(0, count - 1)) + unitRadius;
