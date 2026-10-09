import { rubberband } from './physics.ts';

/**
 * Pure maths for {@link SwipeableRow} (Spark-style): a short swipe arms the first action of a
 * side, a long swipe arms the second; releasing while armed commits it.
 */

export type SwipeSide = 'leading' | 'trailing';

export interface SwipeThresholds {
  /** Fraction of the row width that arms the first action. Default 0.22. */
  arm: number;
  /** Fraction of the row width that arms the second action (if any). Default 0.55. */
  armSecond: number;
  /** Release velocity (px/ms) that commits the first action even below `arm`. Default 0.65. */
  flickVelocity: number;
  /** Minimum travel (fraction of width) for a flick to count. Default 0.08. */
  flickMin: number;
}

export const DEFAULT_SWIPE_THRESHOLDS: SwipeThresholds = {
  arm: 0.22,
  armSecond: 0.55,
  flickVelocity: 0.65,
  flickMin: 0.08,
};

export interface SwipeCounts {
  leading: number;
  trailing: number;
}

export interface SwipeTarget {
  side: SwipeSide;
  /** Index of the action within its side (0 = first/short swipe). */
  index: number;
}

/**
 * Converts the raw finger travel (start-relative, already mirrored for RTL: positive = towards
 * the end edge, revealing leading actions) into the displayed offset. Sides without actions
 * resist strongly; travel beyond the row width rubber-bands.
 */
export function swipeOffset(raw: number, width: number, counts: SwipeCounts): number {
  if (width <= 0 || raw === 0) return 0;
  const side: SwipeSide = raw > 0 ? 'leading' : 'trailing';
  const sign = Math.sign(raw);
  const distance = Math.abs(raw);
  const has = side === 'leading' ? counts.leading > 0 : counts.trailing > 0;
  if (!has) return sign * rubberband(distance, width * 0.12, 0.55);
  const limit = width * 0.86;
  if (distance <= limit) return raw;
  return sign * (limit + rubberband(distance - limit, width * 0.14, 0.55));
}

/** Which action is armed at a displayed offset, or `null`. */
export function armedAction(
  offset: number,
  width: number,
  counts: SwipeCounts,
  t: SwipeThresholds = DEFAULT_SWIPE_THRESHOLDS,
): SwipeTarget | null {
  if (width <= 0 || offset === 0) return null;
  const side: SwipeSide = offset > 0 ? 'leading' : 'trailing';
  const count = side === 'leading' ? counts.leading : counts.trailing;
  if (count === 0) return null;
  const fraction = Math.abs(offset) / width;
  if (count >= 2 && fraction >= t.armSecond) return { side, index: 1 };
  if (fraction >= t.arm) return { side, index: 0 };
  return null;
}

/**
 * The action committed when the finger lifts: the armed one, or the first action of the side
 * on a quick flick in the same direction. `null` = spring back.
 */
export function resolveSwipeRelease(
  offset: number,
  velocity: number,
  width: number,
  counts: SwipeCounts,
  t: SwipeThresholds = DEFAULT_SWIPE_THRESHOLDS,
): SwipeTarget | null {
  const armed = armedAction(offset, width, counts, t);
  // Flicking back towards the centre cancels.
  if (armed && Math.sign(velocity) === -Math.sign(offset) && Math.abs(velocity) > t.flickVelocity)
    return null;
  if (armed) return armed;
  if (width <= 0 || offset === 0) return null;
  const side: SwipeSide = offset > 0 ? 'leading' : 'trailing';
  const count = side === 'leading' ? counts.leading : counts.trailing;
  const sameDirection = Math.sign(velocity) === Math.sign(offset);
  if (
    count > 0 &&
    sameDirection &&
    Math.abs(velocity) >= t.flickVelocity &&
    Math.abs(offset) / width >= t.flickMin
  )
    return { side, index: 0 };
  return null;
}

/** Decides whether a pointer move starts a horizontal swipe (vs. a vertical scroll). */
export function detectSwipeAxis(dx: number, dy: number, slop = 8): 'x' | 'y' | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < slop && ay < slop) return null;
  return ax > ay * 1.2 ? 'x' : 'y';
}
