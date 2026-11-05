/**
 * Store mutations of the Today view. Each user gesture is one undo step (`store.batch`).
 */
import { tasks as taskEngine, type Id, type Interval, type Timestamp } from '@pouxis/core';
import type { EventDraft, Move, Placement } from '@pouxis/core/scheduler';
import type { Store } from '../../store/index.ts';

/** Gives each placed task its slot; returns how many tasks moved. */
export function applyPlacements(store: Store, placements: readonly Placement[], label?: string) {
  return store.batch(() => {
    let count = 0;
    for (const p of placements) {
      if (!store.get('tasks', p.taskId)) continue;
      store.update('tasks', p.taskId, { scheduled: { start: p.start, end: p.end } });
      count++;
    }
    return count;
  }, label);
}

/** Schedules one task in a slot (drop on a free gap). */
export function scheduleTask(store: Store, taskId: Id, slot: Interval): void {
  store.update('tasks', taskId, { scheduled: { start: slot.start, end: slot.end } });
}

/**
 * Applies a delay propagation (1.2): moves slots and sends what no longer fits today to
 * tomorrow's floating tasks. Returns the number of items moved (overrun item excluded).
 */
export function applyPropagation(
  store: Store,
  overrunId: Id,
  moves: readonly Move[],
  overflow: readonly Id[],
  tomorrow: Timestamp,
  label?: string,
): number {
  const sendToTomorrow = new Set(overflow);
  return store.batch(() => {
    let moved = 0;
    for (const m of moves) {
      if (m.kind === 'task' && sendToTomorrow.has(m.id)) {
        const task = store.get('tasks', m.id);
        if (task) store.update('tasks', m.id, taskEngine.postponePatch(task, tomorrow));
      } else if (m.kind === 'task') {
        store.update('tasks', m.id, { scheduled: { start: m.start, end: m.end } });
      } else {
        store.update('events', m.id, { start: m.start, end: m.end });
      }
      if (m.id !== overrunId) moved++;
    }
    return moved;
  }, label);
}

/** Stores suggested transition buffers (1.6) as calendar events. */
export function addBuffers(store: Store, drafts: readonly EventDraft[], label?: string): number {
  return store.batch(() => {
    for (const d of drafts) store.create('events', d);
    return drafts.length;
  }, label);
}

/** Moves an event to a new slot of the same length. */
export function moveEvent(store: Store, eventId: Id, slot: Interval): void {
  store.update('events', eventId, { start: slot.start, end: slot.end });
}
