/**
 * Delay propagation (1.2): when an item runs over, later items of the same local day slide
 * so the plan stays consistent.
 *
 * - Fixed items (events with `fixed`, pinned tasks) never move; a movable item that would
 *   collide with one jumps right after it.
 * - Moved items keep their duration and never overlap each other nor the overrunning item.
 * - Only open tasks with a valid slot and valid events take part; items that start before
 *   the overrunning item are left alone.
 */
import type { CalendarEvent, Id, Interval, Task, Timestamp } from '../model.ts';
import { overlaps } from '../time.ts';
import { compareIds, isValidInterval, localDate, localDay, workingWindow } from './calendar.ts';
import { isOpen, isTask } from './items.ts';
import type { ItemKind, Move, PropagateInput, PropagateResult } from './types.ts';

interface Slot extends Interval {
  id: Id;
  kind: ItemKind;
  fixed: boolean;
}

export function propagateDelay(input: PropagateInput): PropagateResult {
  const empty: PropagateResult = { moves: [], overflow: [], conflicts: [] };
  const slots = toSlots(input.items);
  const overrun = slots.find((s) => s.id === input.overrunId);
  if (!overrun || !Number.isFinite(input.newEnd) || input.newEnd <= overrun.start) return empty;

  const stretched: Interval = { start: overrun.start, end: input.newEnd };
  const day = localDay(localDate(overrun.start, input.timeZone), input.timeZone);
  const fixed = slots.filter((s) => s.fixed && s.id !== overrun.id);
  const later = slots
    .filter((s) => !s.fixed && s.id !== overrun.id && s.start >= overrun.start && s.start < day.end)
    .sort((a, b) => a.start - b.start || compareIds(a.id, b.id));

  const moves: Move[] = [];
  if (input.newEnd !== overrun.end) moves.push(toMove(overrun, stretched));

  const delta = input.newEnd - overrun.end;
  const mode = input.mode ?? 'shift';
  let cursor = input.newEnd;
  for (const item of later) {
    const desired = mode === 'shift' ? Math.max(item.start + Math.max(0, delta), cursor) : cursor;
    const start = clearOfFixed(Math.max(item.start, desired), item.end - item.start, fixed);
    const end = start + (item.end - item.start);
    cursor = Math.max(cursor, end);
    if (start !== item.start) moves.push(toMove(item, { start, end }));
  }

  const window = workingWindow(day, input.prefs.workingHours, input.timeZone, true);
  const limit = window?.end ?? day.end;
  return {
    moves: moves.sort((a, b) => a.start - b.start || compareIds(a.id, b.id)),
    overflow: moves.filter((m) => m.id !== overrun.id && m.end > limit).map((m) => m.id),
    conflicts: fixed
      .filter((f) => overlaps(f, stretched))
      .map((f) => f.id)
      .sort(compareIds),
  };
}

/** First start at or after `from` where `[start, start + dur)` overlaps no fixed slot. */
function clearOfFixed(from: Timestamp, dur: number, fixed: readonly Interval[]): Timestamp {
  let start = from;
  for (;;) {
    const hit = fixed.find((f) => overlaps(f, { start, end: start + dur }));
    if (!hit) return start;
    start = hit.end;
  }
}

function toSlots(items: readonly (Task | CalendarEvent)[]): Slot[] {
  const out: Slot[] = [];
  for (const item of items) {
    if (isTask(item)) {
      const s = item.scheduled;
      if (s && isOpen(item) && isValidInterval(s)) {
        out.push({
          id: item.id,
          kind: 'task',
          start: s.start,
          end: s.end,
          fixed: item.pinned === true,
        });
      }
    } else if (isValidInterval(item)) {
      out.push({ id: item.id, kind: 'event', start: item.start, end: item.end, fixed: item.fixed });
    }
  }
  return out;
}

function toMove(slot: Slot, to: Interval): Move {
  return { id: slot.id, kind: slot.kind, start: to.start, end: to.end };
}
