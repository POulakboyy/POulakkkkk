/**
 * Pure gesture maths shared by Sheet, SwipeableRow and Toast. No DOM access: unit-tested.
 */

/**
 * iOS-style rubber banding: the further past the limit, the stronger the resistance.
 * Returns the displayed overshoot for a raw overshoot `distance` (≥ 0), never exceeding `dimension`.
 *
 * @param constant 0.55 matches UIScrollView.
 */
export function rubberband(distance: number, dimension: number, constant = 0.55): number {
  if (distance <= 0 || dimension <= 0) return 0;
  return (1 - 1 / ((distance * constant) / dimension + 1)) * dimension;
}

/** Applies rubber banding outside `[min, max]`, passes values through inside the range. */
export function rubberbandClamp(
  value: number,
  min: number,
  max: number,
  dimension: number,
  constant = 0.55,
): number {
  if (value < min) return min - rubberband(min - value, dimension, constant);
  if (value > max) return max + rubberband(value - max, dimension, constant);
  return value;
}

export interface Sample {
  /** Position in px. */
  p: number;
  /** Timestamp in ms. */
  t: number;
}

/**
 * Tracks recent pointer positions and estimates the release velocity (px/ms) over the last
 * `windowMs`, which ignores the slow-down that often happens right before lifting a finger.
 */
export class VelocityTracker {
  private samples: Sample[] = [];
  private readonly windowMs: number;

  constructor(windowMs = 100) {
    this.windowMs = windowMs;
  }

  reset(): void {
    this.samples = [];
  }

  add(p: number, t: number): void {
    this.samples.push({ p, t });
    const cutoff = t - this.windowMs * 2;
    while (this.samples.length > 2 && this.samples[0]!.t < cutoff) this.samples.shift();
  }

  velocity(now?: number): number {
    return estimateVelocity(this.samples, this.windowMs, now);
  }
}

/** Velocity (px/ms) between the oldest sample within `windowMs` of the last one and the last one. */
export function estimateVelocity(samples: readonly Sample[], windowMs = 100, now?: number): number {
  const last = samples[samples.length - 1];
  if (!last) return 0;
  // A finger resting still before release means no fling.
  if (now !== undefined && now - last.t > windowMs) return 0;
  let first = last;
  for (let i = samples.length - 1; i >= 0; i--) {
    const s = samples[i]!;
    if (last.t - s.t > windowMs) break;
    first = s;
  }
  const dt = last.t - first.t;
  return dt > 0 ? (last.p - first.p) / dt : 0;
}

/**
 * Where a flung element would come to rest with exponential deceleration (UIScrollView model).
 *
 * @param velocity px/ms
 * @param decelerationRate per-ms rate; 0.998 = "normal" (1 px/ms travels ~500 px), 0.99 = "fast" (~100 px).
 */
export function projectPosition(position: number, velocity: number, decelerationRate = 0.998): number {
  return position + (velocity * decelerationRate) / (1 - decelerationRate);
}

/** The candidate closest to `value`. */
export function nearest(value: number, candidates: readonly number[]): number {
  let best = candidates[0] ?? value;
  for (const c of candidates) if (Math.abs(c - value) < Math.abs(best - value)) best = c;
  return best;
}

export interface SheetSnapInput {
  /** Current translateY offset in px (0 = fully open at the tallest snap point). */
  offset: number;
  /** Release velocity in px/ms (positive = downward). */
  velocity: number;
  /** Offsets (px) of every snap point, from tallest (0) to shortest. */
  snapOffsets: readonly number[];
  /** Offset at which the sheet is fully hidden (its height). */
  closedOffset: number;
  /** Whether releasing towards `closedOffset` may dismiss. */
  dismissible: boolean;
  /** Velocity (px/ms) above which a downward flick from the lowest snap dismisses. Default 0.8. */
  flickVelocity?: number;
}

/**
 * Decides where a bottom sheet settles after a drag: projects the fling, then picks the
 * nearest snap point (or `'dismiss'`). A fast downward flick below the lowest snap dismisses.
 */
export function resolveSheetRelease({
  offset,
  velocity,
  snapOffsets,
  closedOffset,
  dismissible,
  flickVelocity = 0.8,
}: SheetSnapInput): number | 'dismiss' {
  const lowest = Math.max(...snapOffsets);
  if (dismissible && velocity > flickVelocity && offset >= lowest - 1) return 'dismiss';
  const projected = projectPosition(offset, velocity, 0.99);
  const candidates = dismissible ? [...snapOffsets, closedOffset] : [...snapOffsets];
  const target = nearest(projected, candidates);
  return dismissible && target === closedOffset ? 'dismiss' : target;
}
