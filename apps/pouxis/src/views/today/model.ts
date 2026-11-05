/**
 * Pure model of the Today view: which records appear on the day's timeline, how they are laid
 * out, where the free gaps are and which slot runs over. No React, no clock: `now` and the
 * time zone are always parameters so every rule is testable.
 */
import {
  HOUR,
  MINUTE,
  atMinutes,
  freeSlots,
  minutesOfDay,
  weekday,
  type CalendarEvent,
  type EventKind,
  type Id,
  type Interval,
  type Task,
  type TimeZone,
  type Timestamp,
  type UserPrefs,
} from '@pouxis/core';
import type { EventDraft } from '@pouxis/core/scheduler';

export type ItemKind = 'task' | 'event' | 'buffer';

export interface TimelineItem extends Interval {
  /** Record id; virtual buffers get a synthetic `buffer:<start>` id. */
  id: Id;
  kind: ItemKind;
  title: string;
  icon: string;
  /** Category slot 1–8 (`--cat-n`). */
  color: number;
  /** Never moved by delay propagation (fixed events, pinned tasks). */
  fixed: boolean;
  done: boolean;
  /** The task this block completes: the task itself, or the task an event time-blocks. */
  task?: Task;
  event?: CalendarEvent;
  /** A suggested buffer computed by the scheduler, not stored yet. */
  virtual?: boolean;
}

const EVENT_ICON: Record<EventKind, string> = {
  meeting: '💬',
  focus: '🎯',
  personal: '☕',
  travel: '🚆',
  buffer: '🌿',
};

const EVENT_COLOR: Record<EventKind, number> = {
  meeting: 4,
  focus: 7,
  personal: 3,
  travel: 6,
  buffer: 8,
};

/** Category slot of a record, clamped to the 8-colour palette. */
export function categorySlot(color: number | undefined, fallback: number): number {
  if (color === undefined || !Number.isFinite(color)) return fallback;
  return ((Math.round(color) - 1 + 8 * 1000) % 8) + 1;
}

function taskItem(task: Task, slot: Interval): TimelineItem {
  return {
    id: task.id,
    kind: 'task',
    title: task.title,
    icon: task.icon ?? (task.mode === 'create' ? '✏️' : '📋'),
    color: categorySlot(task.color, task.mode === 'create' ? 1 : 2),
    fixed: task.pinned === true,
    done: task.status === 'done',
    task,
    start: slot.start,
    end: slot.end,
  };
}

function eventItem(event: CalendarEvent, linked: Task | undefined): TimelineItem {
  const item: TimelineItem = {
    id: event.id,
    kind: event.kind === 'buffer' ? 'buffer' : 'event',
    title: event.title,
    icon: event.icon ?? EVENT_ICON[event.kind],
    color: categorySlot(event.color, EVENT_COLOR[event.kind]),
    fixed: event.fixed,
    done: linked?.status === 'done',
    event,
    start: event.start,
    end: event.end,
  };
  if (linked) item.task = linked;
  return item;
}

const inDay = (i: Interval, day: Interval) => i.end > day.start && i.start < day.end;
const byStart = (a: TimelineItem, b: TimelineItem) =>
  a.start - b.start || a.end - b.end || a.id.localeCompare(b.id);

/**
 * Events and scheduled tasks overlapping `day`, chronological. A task time-blocked by an event
 * shows once, as the event, with its checkbox. Archived tasks and empty slots are left out.
 */
export function dayItems(
  tasks: readonly Task[],
  events: readonly CalendarEvent[],
  day: Interval,
): TimelineItem[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const blockedTaskIds = new Set<Id>();
  const items: TimelineItem[] = [];
  for (const event of events) {
    if (!(event.end > event.start) || !inDay(event, day)) continue;
    const linked = event.taskId ? byId.get(event.taskId) : undefined;
    if (linked) blockedTaskIds.add(linked.id);
    items.push(eventItem(event, linked));
  }
  for (const task of tasks) {
    const slot = task.scheduled;
    if (!slot || !(slot.end > slot.start) || !inDay(slot, day)) continue;
    if (task.status === 'archived' || blockedTaskIds.has(task.id)) continue;
    items.push(taskItem(task, slot));
  }
  return items.sort(byStart);
}

/** Suggested buffers (scheduler drafts) as virtual timeline items. */
export function bufferItems(drafts: readonly EventDraft[]): TimelineItem[] {
  return drafts.map((d) => ({
    id: `buffer:${d.start}`,
    kind: 'buffer',
    title: d.title,
    icon: EVENT_ICON.buffer,
    color: EVENT_COLOR.buffer,
    fixed: false,
    done: false,
    virtual: true,
    start: d.start,
    end: d.end,
  }));
}

/** Floating tasks of the day (1.10): open, attached to the day, without a slot. */
export function floatingTasks(tasks: readonly Task[], day: Interval): Task[] {
  return tasks
    .filter(
      (t) =>
        t.floatingDay !== undefined &&
        t.floatingDay >= day.start &&
        t.floatingDay < day.end &&
        t.scheduled === undefined &&
        (t.status === 'inbox' || t.status === 'todo' || t.status === 'doing'),
    )
    .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
}

export interface Lane {
  lane: number;
  lanes: number;
}

/**
 * Side-by-side columns for overlapping items (calendar-style): items of a cluster of
 * transitively overlapping items share its column count; each takes the first free column.
 */
export function layoutLanes(items: readonly TimelineItem[]): Map<Id, Lane> {
  const out = new Map<Id, Lane>();
  const sorted = [...items].sort(byStart);
  let cluster: TimelineItem[] = [];
  let laneEnds: Timestamp[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    for (const item of cluster) {
      const prev = out.get(item.id);
      if (prev) out.set(item.id, { lane: prev.lane, lanes: laneEnds.length });
    }
    cluster = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) lane = laneEnds.push(item.end) - 1;
    else laneEnds[lane] = item.end;
    out.set(item.id, { lane, lanes: 1 });
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();
  return out;
}

export interface DayWindow extends Interval {
  /** Working hours of that day; absent on a day off. */
  work?: Interval;
}

/** Working-hours interval of the local day containing `day`, or undefined on a day off. */
export function workingInterval(
  day: Timestamp,
  prefs: UserPrefs,
  timeZone: TimeZone,
): Interval | undefined {
  const { start, end, days } = prefs.workingHours;
  if (!days.includes(weekday(day, timeZone)) || !(end > start)) return undefined;
  return { start: atMinutes(day, start, timeZone), end: atMinutes(day, end, timeZone) };
}

/**
 * Visible span of the timeline: working hours (or 8:00–20:00 on a day off) widened to every
 * item and to `now`, snapped outward to whole local hours and clamped to the day.
 */
export function dayWindow(
  day: Interval,
  items: readonly Interval[],
  prefs: UserPrefs,
  timeZone: TimeZone,
  now?: Timestamp,
): DayWindow {
  const work = workingInterval(day.start, prefs, timeZone);
  let start = work?.start ?? atMinutes(day.start, 8 * 60, timeZone);
  let end = work?.end ?? atMinutes(day.start, 20 * 60, timeZone);
  for (const i of items) {
    start = Math.min(start, i.start);
    end = Math.max(end, i.end);
  }
  if (now !== undefined && now >= day.start && now < day.end) {
    start = Math.min(start, now);
    end = Math.max(end, now + 30 * MINUTE);
  }
  start = Math.max(day.start, floorToHour(start, timeZone));
  end = Math.min(day.end, ceilToHour(end, timeZone));
  return work ? { start, end, work } : { start, end };
}

function floorToHour(ts: Timestamp, timeZone: TimeZone): Timestamp {
  const m = minutesOfDay(ts, timeZone);
  return atMinutes(ts, Math.floor(m / 60) * 60, timeZone);
}

function ceilToHour(ts: Timestamp, timeZone: TimeZone): Timestamp {
  const floored = floorToHour(ts, timeZone);
  return floored === ts ? ts : floored + HOUR;
}

/** Hour gridlines of a window: every whole local hour inside it, window start included. */
export function hourMarks(window: Interval, timeZone: TimeZone): Timestamp[] {
  const marks: Timestamp[] = [];
  for (let ts = floorToHour(window.start, timeZone); ts <= window.end; ts += HOUR) {
    if (ts >= window.start) marks.push(ts);
  }
  return marks;
}

/** Minutes from the window start — the unit the CSS multiplies by `--ppm`. */
export function minutesFrom(window: Interval, ts: Timestamp): number {
  return (ts - window.start) / MINUTE;
}

/**
 * Free working time from `now` (or the window start) to the end of working hours, in gaps of
 * at least `minMin` minutes. Done tasks still occupy their slot; virtual buffers count as busy.
 */
export function freeGaps(
  window: DayWindow,
  items: readonly Interval[],
  now: Timestamp,
  minMin = 30,
): Interval[] {
  if (!window.work) return [];
  const range = { start: Math.max(window.work.start, now), end: window.work.end };
  if (!(range.end > range.start)) return [];
  return freeSlots(range, items).filter((g) => g.end - g.start >= minMin * MINUTE);
}

/** Total minutes of a list of intervals. */
export function totalMinutes(intervals: readonly Interval[]): number {
  return intervals.reduce((sum, i) => sum + (i.end - i.start) / MINUTE, 0);
}

/** Minutes of focused work planned: task blocks and `focus` events. */
export function focusMinutes(items: readonly TimelineItem[]): number {
  return totalMinutes(
    items.filter((i) => i.kind === 'task' || (i.kind === 'event' && i.event?.kind === 'focus')),
  );
}

/** How long after its planned end an open task is still offered as "running over". */
export const OVERRUN_WINDOW_MIN = 90;

/**
 * The open task whose slot ended most recently, within `OVERRUN_WINDOW_MIN`, and that the user
 * has not dismissed — the candidate for delay propagation (1.2).
 */
export function findOverrun(
  items: readonly TimelineItem[],
  now: Timestamp,
  dismissed: ReadonlySet<Id> = new Set(),
): TimelineItem | undefined {
  let found: TimelineItem | undefined;
  for (const item of items) {
    const open = item.task && item.task.status !== 'done' && item.task.status !== 'archived';
    if (!open || item.end > now || dismissed.has(item.id)) continue;
    if (now - item.end > OVERRUN_WINDOW_MIN * MINUTE) continue;
    if (!found || item.end > found.end) found = item;
  }
  return found;
}

/** Proposed new end of an overrunning slot: `extraMin` from now, on a 5-minute grid. */
export function overrunEnd(now: Timestamp, extraMin = 15): Timestamp {
  const step = 5 * MINUTE;
  return Math.ceil(now / step) * step + extraMin * MINUTE;
}

/** Energy value 0..1 → sequential bucket 0..4 (`--heat-n`). */
export function heatLevel(value: number): 0 | 1 | 2 | 3 | 4 {
  if (!Number.isFinite(value)) return 0;
  return Math.min(4, Math.max(0, Math.floor(value * 5))) as 0 | 1 | 2 | 3 | 4;
}

/** Spoken energy word for a bucket. */
export function energyWord(level: number): 'low' | 'medium' | 'high' {
  if (level >= 3) return 'high';
  return level >= 2 ? 'medium' : 'low';
}

/** Part of the day for the greeting, from the local hour. */
export function greetingPeriod(now: Timestamp, timeZone: TimeZone) {
  const h = minutesOfDay(now, timeZone) / 60;
  if (h >= 18 || h < 4) return 'evening' as const;
  return h >= 12 ? ('afternoon' as const) : ('morning' as const);
}

/** First item running at `now`, if any. */
export function currentItem(
  items: readonly TimelineItem[],
  now: Timestamp,
): TimelineItem | undefined {
  return items.find((i) => i.start <= now && now < i.end && i.kind !== 'buffer');
}
