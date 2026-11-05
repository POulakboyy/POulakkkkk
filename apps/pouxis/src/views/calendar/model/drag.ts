/**
 * Geometry of direct manipulation in the time grid: snapping, move / resize / create
 * gestures and their keyboard equivalents. Works in wall-clock minutes of a day column.
 */
import { atMinutes, type TimeZone, type Timestamp } from '@pouxis/core';
import { DAY_MINUTES } from './layout.ts';

export const SNAP_MIN = 15;
export const MIN_DURATION = 15;
/** Pointer travel (px) under which a press is a click, not a drag. */
export const DRAG_THRESHOLD_PX = 4;

export interface Slot {
  /** Column index in the visible days. */
  day: number;
  startMin: number;
  endMin: number;
}

export type Gesture = 'move' | 'resize-start' | 'resize-end';

export function snap(minutes: number, step = SNAP_MIN): number {
  return Math.round(minutes / step) * step;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Minutes from midnight at a vertical offset inside a column. */
export function minutesAt(offsetY: number, hourHeight: number): number {
  return clamp((offsetY / hourHeight) * 60, 0, DAY_MINUTES);
}

/** Applies a pointer or keyboard delta to a slot. The result is always a valid, snapped slot. */
export function applyGesture(
  gesture: Gesture,
  origin: Slot,
  deltaMin: number,
  deltaDay: number,
  dayCount: number,
): Slot {
  const length = origin.endMin - origin.startMin;
  if (gesture === 'move') {
    const startMin = clamp(snap(origin.startMin + deltaMin), 0, DAY_MINUTES - length);
    const day = clamp(origin.day + deltaDay, 0, dayCount - 1);
    return { day, startMin, endMin: startMin + length };
  }
  if (gesture === 'resize-end') {
    const endMin = clamp(
      snap(origin.endMin + deltaMin),
      origin.startMin + MIN_DURATION,
      DAY_MINUTES,
    );
    return { ...origin, endMin };
  }
  const startMin = clamp(snap(origin.startMin + deltaMin), 0, origin.endMin - MIN_DURATION);
  return { ...origin, startMin };
}

/** Slot drawn from an anchor minute to the current one (either direction), snapped. */
export function drawSlot(day: number, anchorMin: number, currentMin: number): Slot {
  const a = snap(Math.min(anchorMin, currentMin), SNAP_MIN);
  let b = snap(Math.max(anchorMin, currentMin), SNAP_MIN);
  if (b - a < MIN_DURATION) b = a + MIN_DURATION;
  if (b > DAY_MINUTES) return { day, startMin: DAY_MINUTES - MIN_DURATION, endMin: DAY_MINUTES };
  return { day, startMin: a, endMin: b };
}

export interface KeyCommand {
  gesture: Gesture;
  deltaMin: number;
  deltaDay: number;
}

/**
 * Keyboard equivalents of the pointer gestures on a focused event:
 * ↑/↓ move by 15 min, ←/→ move by a day, Shift+↑/↓ change the end, Alt+Shift+↑/↓ the start.
 */
export function keyCommand(
  key: string,
  modifiers: { shiftKey: boolean; altKey: boolean },
): KeyCommand | null {
  const vertical = key === 'ArrowUp' ? -SNAP_MIN : key === 'ArrowDown' ? SNAP_MIN : 0;
  if (vertical !== 0) {
    if (modifiers.shiftKey && modifiers.altKey) {
      return { gesture: 'resize-start', deltaMin: vertical, deltaDay: 0 };
    }
    if (modifiers.shiftKey) return { gesture: 'resize-end', deltaMin: vertical, deltaDay: 0 };
    return { gesture: 'move', deltaMin: vertical, deltaDay: 0 };
  }
  if (modifiers.shiftKey || modifiers.altKey) return null;
  if (key === 'ArrowLeft') return { gesture: 'move', deltaMin: 0, deltaDay: -1 };
  if (key === 'ArrowRight') return { gesture: 'move', deltaMin: 0, deltaDay: 1 };
  return null;
}

/** Instants of a slot drawn in the column of local day `dayStart` (`endMin` may be 1440). */
export function slotInterval(
  slot: Slot,
  days: readonly Timestamp[],
  timeZone: TimeZone,
): { start: Timestamp; end: Timestamp } | null {
  const dayStart = days[slot.day];
  if (dayStart === undefined) return null;
  return {
    start: atMinutes(dayStart, slot.startMin, timeZone),
    end: atMinutes(dayStart, slot.endMin, timeZone),
  };
}
