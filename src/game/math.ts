export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Frame-rate independent exponential smoothing factor. */
export const damp = (sharpness: number, dt: number): number => 1 - Math.exp(-sharpness * dt);

export const circlesOverlap = (
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean => {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
};

/** Circle vs. axis-aligned rect given by its centre and half extents. */
export const circleRectOverlap = (
  cx: number,
  cy: number,
  r: number,
  rx: number,
  ry: number,
  halfW: number,
  halfH: number,
): boolean => {
  const nx = clamp(cx, rx - halfW, rx + halfW);
  const ny = clamp(cy, ry - halfH, ry + halfH);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
};
