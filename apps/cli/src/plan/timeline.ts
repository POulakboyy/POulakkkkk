/**
 * ASCII day timeline for `pouxis plan`: one row per step (15/30/60 min), a two-character
 * marker per row (`##` event, `==` task, `~~` buffer, `!!` overlap) and each item's label on
 * the row where it starts.
 */
import { addDays, atMinutes, minutesOfDay } from '@pouxis/core';
import type { Minutes, TimeZone, Timestamp } from '@pouxis/core';
import type { Palette } from '../output.ts';
import { truncate } from '../format/text.ts';

export type TimelineKind = 'event' | 'task' | 'buffer';

export interface TimelineItem {
  kind: TimelineKind;
  start: Timestamp;
  end: Timestamp;
  label: string;
  /** Proposed by the planner (not saved yet): drawn dimmer. */
  proposed?: boolean;
}

export interface TimelineOptions {
  day: Timestamp;
  timeZone: TimeZone;
  stepMin: Minutes;
  /** Rows always cover at least the working hours. */
  workStart: Minutes;
  workEnd: Minutes;
  /** Draws the "now" marker when it falls on this day. */
  now?: Timestamp;
  nowLabel: string;
  c: Palette;
  width: number;
}

const MARKS: Record<TimelineKind, string> = { event: '##', task: '==', buffer: '~~' };
const DAY_MINUTES = 24 * 60;

/** Rows `[first, last)` in minutes after midnight, snapped to the step. */
export function timelineBounds(
  items: readonly TimelineItem[],
  o: TimelineOptions,
): [Minutes, Minutes] {
  const dayStart = atMinutes(o.day, 0, o.timeZone);
  const nextDay = addDays(dayStart, 1, o.timeZone);
  const toMinutes = (ts: Timestamp): Minutes =>
    ts <= dayStart ? 0 : ts >= nextDay ? DAY_MINUTES : minutesOfDay(ts, o.timeZone);
  let first = o.workStart;
  let last = o.workEnd;
  for (const item of items) {
    first = Math.min(first, toMinutes(item.start));
    last = Math.max(last, toMinutes(item.end));
  }
  first = Math.floor(first / o.stepMin) * o.stepMin;
  last = Math.min(DAY_MINUTES, Math.ceil(last / o.stepMin) * o.stepMin);
  return [first, Math.max(last, first + o.stepMin)];
}

export function renderTimeline(items: readonly TimelineItem[], o: TimelineOptions): string[] {
  const { c } = o;
  const [first, last] = timelineBounds(items, o);
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const lines: string[] = [];
  const started = new Set<TimelineItem>();

  for (let minute = first; minute < last; minute += o.stepMin) {
    const rowStart = atMinutes(o.day, minute, o.timeZone);
    const rowEnd = atMinutes(o.day, minute + o.stepMin, o.timeZone);
    const active = sorted.filter((i) => i.start < rowEnd && i.end > rowStart);
    const solid = active.filter((i) => i.kind !== 'buffer');
    const fresh = active.filter((i) => !started.has(i));
    for (const item of fresh) started.add(item);

    const hour = `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
    const working = minute >= o.workStart && minute < o.workEnd;
    const gutter = working ? '│' : c.dim('┆');
    const mark = rowMark(active, solid, c);
    const labels = fresh.map((i) => label(i, o));
    const nowHere = o.now !== undefined && o.now >= rowStart && o.now < rowEnd;
    let text = labels.join(c.dim(' · '));
    if (nowHere) text = text ? `${text}  ${c.red(o.nowLabel)}` : c.red(o.nowLabel);
    const head = `${working ? hour : c.dim(hour)} ${gutter} ${mark}`;
    lines.push(text ? `${head} ${truncate(text, Math.max(10, o.width - 12))}` : head.trimEnd());
  }
  return lines;
}

function rowMark(
  active: readonly TimelineItem[],
  solid: readonly TimelineItem[],
  c: Palette,
): string {
  if (hasOverlap(solid)) return c.red('!!');
  const item = solid[0] ?? active[0];
  if (!item) return '  ';
  const mark = MARKS[item.kind];
  if (item.kind === 'event') return c.blue(mark);
  if (item.kind === 'buffer') return c.dim(mark);
  return item.proposed ? c.green(mark) : c.bold(c.green(mark));
}

/** Two items of the row really overlap in time (merely sharing a row is not a conflict). */
export function hasOverlap(items: readonly TimelineItem[]): boolean {
  let reach = -Infinity;
  for (const item of [...items].sort((a, b) => a.start - b.start)) {
    if (item.start < reach) return true;
    reach = Math.max(reach, item.end);
  }
  return false;
}

function label(item: TimelineItem, o: TimelineOptions): string {
  const time = (ts: Timestamp) => {
    const m = minutesOfDay(ts, o.timeZone);
    return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  };
  const range = o.c.dim(`${time(item.start)}–${time(item.end)}`);
  const text =
    item.kind === 'buffer'
      ? o.c.dim(item.label)
      : item.proposed
        ? o.c.italic(item.label)
        : item.label;
  return `${text} ${range}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
