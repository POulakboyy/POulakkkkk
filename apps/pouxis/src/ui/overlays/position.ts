/** Pure positioning for anchored overlays (Popover, Menu, Tooltip). Unit-tested. */

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';
export type Placement = Side | `${Side}-start` | `${Side}-end`;

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface PositionOptions {
  /** Gap between anchor and overlay (px). Default 8. */
  offset?: number;
  /** Minimum distance from the viewport edges (px). Default 8. */
  padding?: number;
  viewport: { width: number; height: number };
}

export interface Position {
  x: number;
  y: number;
  /** Final placement after flipping. */
  placement: Placement;
  /** CSS `transform-origin` pointing at the anchor, for scale-in animations. */
  origin: string;
}

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

export function splitPlacement(p: Placement): [Side, Align] {
  const [side, align] = p.split('-') as [Side, Align | undefined];
  return [side, align ?? 'center'];
}

function place(anchor: Rect, size: { width: number; height: number }, side: Side, align: Align, offset: number) {
  let x = 0;
  let y = 0;
  if (side === 'top' || side === 'bottom') {
    y = side === 'bottom' ? anchor.top + anchor.height + offset : anchor.top - offset - size.height;
    x =
      align === 'start'
        ? anchor.left
        : align === 'end'
          ? anchor.left + anchor.width - size.width
          : anchor.left + anchor.width / 2 - size.width / 2;
  } else {
    x = side === 'right' ? anchor.left + anchor.width + offset : anchor.left - offset - size.width;
    y =
      align === 'start'
        ? anchor.top
        : align === 'end'
          ? anchor.top + anchor.height - size.height
          : anchor.top + anchor.height / 2 - size.height / 2;
  }
  return { x, y };
}

function overflowOnSide(
  side: Side,
  pos: { x: number; y: number },
  size: { width: number; height: number },
  vp: { width: number; height: number },
  padding: number,
): number {
  switch (side) {
    case 'bottom':
      return pos.y + size.height - (vp.height - padding);
    case 'top':
      return padding - pos.y;
    case 'right':
      return pos.x + size.width - (vp.width - padding);
    case 'left':
      return padding - pos.x;
  }
}

/**
 * Places an overlay next to its anchor, flipping to the opposite side when it would overflow
 * (and the other side has more room), then shifting along the cross axis to stay on screen.
 */
export function computePosition(
  anchor: Rect,
  size: { width: number; height: number },
  placement: Placement,
  { offset = 8, padding = 8, viewport }: PositionOptions,
): Position {
  let [side, align] = splitPlacement(placement);
  let pos = place(anchor, size, side, align, offset);
  const over = overflowOnSide(side, pos, size, viewport, padding);
  if (over > 0) {
    const flipped = OPPOSITE[side];
    const alt = place(anchor, size, flipped, align, offset);
    const altOver = overflowOnSide(flipped, alt, size, viewport, padding);
    if (altOver < over) {
      side = flipped;
      pos = alt;
    }
  }
  // Shift along the cross axis.
  if (side === 'top' || side === 'bottom') {
    pos.x = clamp(pos.x, padding, viewport.width - padding - size.width);
  } else {
    pos.y = clamp(pos.y, padding, viewport.height - padding - size.height);
  }
  const finalPlacement = (align === 'center' ? side : `${side}-${align}`) as Placement;
  return { x: Math.round(pos.x), y: Math.round(pos.y), placement: finalPlacement, origin: originFor(side, align) };
}

function clamp(v: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(v, min), max);
}

function originFor(side: Side, align: Align): string {
  const cross = align === 'start' ? 'left' : align === 'end' ? 'right' : 'center';
  const crossY = align === 'start' ? 'top' : align === 'end' ? 'bottom' : 'center';
  switch (side) {
    case 'bottom':
      return `top ${cross}`;
    case 'top':
      return `bottom ${cross}`;
    case 'right':
      return `${crossY} left`;
    case 'left':
      return `${crossY} right`;
  }
}
