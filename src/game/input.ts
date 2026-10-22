/**
 * Relative drag steering: put a finger anywhere and slide.
 * Arrow keys / A-D are supported for desktop play-testing.
 */
export class DragInput {
  private lastX: number | null = null;
  private pointerId: number | null = null;
  private dragDelta = 0;
  private readonly keys = new Set<string>();

  constructor(
    private readonly element: HTMLElement,
    private readonly pixelsPerUnit: () => number,
  ) {
    element.addEventListener('pointerdown', this.onDown);
    element.addEventListener('pointermove', this.onMove);
    element.addEventListener('pointerup', this.onUp);
    element.addEventListener('pointercancel', this.onUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /** Drag distance in virtual pixels since the last call. */
  consumeDrag(): number {
    const delta = this.dragDelta;
    this.dragDelta = 0;
    return delta;
  }

  /** -1, 0 or 1 from the keyboard. */
  keyAxis(): number {
    const left = this.keys.has('ArrowLeft') || this.keys.has('a');
    const right = this.keys.has('ArrowRight') || this.keys.has('d');
    return Number(right) - Number(left);
  }

  private readonly onDown = (event: PointerEvent): void => {
    if (this.pointerId !== null) return;
    this.pointerId = event.pointerId;
    this.lastX = event.clientX;
    this.element.setPointerCapture(event.pointerId);
  };

  private readonly onMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId || this.lastX === null) return;
    this.dragDelta += (event.clientX - this.lastX) / this.pixelsPerUnit();
    this.lastX = event.clientX;
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.lastX = null;
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.key);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key);
  };
}
