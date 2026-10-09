/**
 * Creation / organisation balance (feature 7.2).
 *
 * Sources and rules:
 * - creation and organisation minutes come from executed focus logs (`TimeLog.kind 'focus'`)
 *   of tasks, attributed to the task's `mode` — what was actually done, not what was planned;
 * - meeting minutes come from calendar events of kind `'meeting'` (pass expanded occurrences
 *   of recurring events);
 * - a minute is never counted twice: overlapping logs of the same category merge, a minute
 *   logged on both a creation and an organisation task is split half/half, and logged focus
 *   takes precedence over a meeting scheduled at the same time (the log is the ground truth);
 * - per-day buckets follow local days in `timeZone`.
 */
import type { CalendarEvent, Interval, Minutes, Task, TimeZone, Timestamp } from '../model.ts';
import { addDays, dayKey, MINUTE, startOfDay } from '../time.ts';
import { assertFiniteTimestamp, clip, focusLogs } from './internal.ts';

export interface BalanceInput {
  tasks: readonly Task[];
  events: readonly CalendarEvent[];
  range: Interval;
  timeZone: TimeZone;
}

export interface BalanceTotals {
  create: Minutes;
  organize: Minutes;
  meetings: Minutes;
  /** `create + organize + meetings`. */
  total: Minutes;
  /** Creation share `create / total` (0..1), `null` when nothing was tracked. */
  ratio: number | null;
}

export interface BalanceDay extends BalanceTotals {
  /** `YYYY-MM-DD` in the requested zone. */
  day: string;
  /** Bucket bounds, clipped to the requested range. */
  start: Timestamp;
  end: Timestamp;
}

export interface Balance extends BalanceTotals {
  /** Share of each category in `total`, `null` when nothing was tracked. */
  shares: { create: number; organize: number; meetings: number } | null;
  /** One entry per local day touched by the range, in order (days with no data included). */
  days: BalanceDay[];
}

const CREATE = 0;
const ORGANIZE = 1;
const MEETING = 2;

interface Edge {
  t: Timestamp;
  cat: number;
  delta: 1 | -1;
}

function totals(create: number, organize: number, meetings: number): BalanceTotals {
  const total = create + organize + meetings;
  return { create, organize, meetings, total, ratio: total > 0 ? create / total : null };
}

/** Minutes of creation, organisation and meetings over `range`, with a per-day series. */
export function balance(input: BalanceInput): Balance {
  const { range, timeZone } = input;
  assertFiniteTimestamp(range.start, 'range.start');
  assertFiniteTimestamp(range.end, 'range.end');
  if (range.end < range.start) throw new RangeError('range.end must be >= range.start');

  const edges: Edge[] = [];
  const push = (i: Interval, cat: number) => {
    const part = clip(i, range);
    if (!part) return;
    edges.push({ t: part.start, cat, delta: 1 }, { t: part.end, cat, delta: -1 });
  };
  for (const task of input.tasks) {
    const cat = task.mode === 'create' ? CREATE : ORGANIZE;
    for (const log of focusLogs(task)) push(log, cat);
  }
  for (const event of input.events) {
    if (event.kind !== 'meeting' || !(event.end > event.start)) continue;
    push({ start: event.start, end: event.end }, MEETING);
  }
  edges.sort((a, b) => a.t - b.t);

  // Local-day buckets.
  const buckets: Array<{ day: string; start: number; end: number; ms: [number, number, number] }> =
    [];
  for (let d = startOfDay(range.start, timeZone); d < range.end; d = addDays(d, 1, timeZone)) {
    const next = addDays(d, 1, timeZone);
    buckets.push({
      day: dayKey(d, timeZone),
      start: Math.max(d, range.start),
      end: Math.min(next, range.end),
      ms: [0, 0, 0],
    });
  }

  // Sweep over every boundary (edges and day limits).
  const points = new Set<number>([range.start, range.end]);
  for (const e of edges) points.add(e.t);
  for (const b of buckets) points.add(b.start);
  const sorted = [...points].sort((a, b) => a - b);
  const active = [0, 0, 0];
  let e = 0;
  let b = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const segStart = sorted[i] as number;
    const segEnd = sorted[i + 1] as number;
    while (e < edges.length && (edges[e] as Edge).t <= segStart) {
      const edge = edges[e] as Edge;
      active[edge.cat] = (active[edge.cat] as number) + edge.delta;
      e++;
    }
    while (b < buckets.length - 1 && (buckets[b] as { end: number }).end <= segStart) b++;
    const bucket = buckets[b];
    if (!bucket) continue;
    const len = segEnd - segStart;
    const c = (active[CREATE] as number) > 0;
    const o = (active[ORGANIZE] as number) > 0;
    if (c && o) {
      bucket.ms[CREATE] += len / 2;
      bucket.ms[ORGANIZE] += len / 2;
    } else if (c) bucket.ms[CREATE] += len;
    else if (o) bucket.ms[ORGANIZE] += len;
    else if ((active[MEETING] as number) > 0) bucket.ms[MEETING] += len;
  }

  const days: BalanceDay[] = buckets.map((bk) => ({
    day: bk.day,
    start: bk.start,
    end: bk.end,
    ...totals(bk.ms[CREATE] / MINUTE, bk.ms[ORGANIZE] / MINUTE, bk.ms[MEETING] / MINUTE),
  }));
  let create = 0;
  let organize = 0;
  let meetings = 0;
  for (const d of days) {
    create += d.create;
    organize += d.organize;
    meetings += d.meetings;
  }
  const all = totals(create, organize, meetings);
  return {
    ...all,
    shares:
      all.total > 0
        ? { create: create / all.total, organize: organize / all.total, meetings: meetings / all.total }
        : null,
    days,
  };
}
