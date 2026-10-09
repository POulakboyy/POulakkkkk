/**
 * Temporal org chart (4.5): the X axis of the canvas is a timeline, so moving a node to the right
 * pushes its due date back. The scale is linear in absolute time; ticks are aligned on wall-clock
 * boundaries of an explicit IANA zone (never the host zone), so day ticks fall on local midnight
 * even across DST changes.
 */
import type { GraphNode, TimeZone, Timestamp } from '../model.ts';
import { DAY, HOUR, MINUTE, fromZoned, startOfWeek, zonedParts } from '../time.ts';
import type { GraphLike } from './types.ts';

export type TickUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

export interface TimeTick {
  ts: Timestamp;
  x: number;
  unit: TickUnit;
  /** Starts the next larger unit (midnight for hours, the 1st for days, January for months…). */
  major: boolean;
}

export interface TimeScaleOptions {
  /** Instant mapped to `x0`. */
  start: Timestamp;
  /** Instant mapped to `x1`; must differ from `start`. */
  end: Timestamp;
  x0: number;
  x1: number;
  /** Zone used to align ticks and day snapping. */
  timeZone: TimeZone;
}

export interface TimeScale {
  readonly start: Timestamp;
  readonly end: Timestamp;
  readonly x0: number;
  readonly x1: number;
  readonly timeZone: TimeZone;
  /** World units per millisecond (negative when the axis is reversed). */
  readonly pxPerMs: number;
  /** Linear, extrapolated outside [start, end] (the canvas is infinite). */
  toX(ts: Timestamp): number;
  toTime(x: number): Timestamp;
  /** About `count` (default 8) nicely aligned ticks covering [start, end]. */
  ticks(count?: number): TimeTick[];
}

interface Interval_ {
  unit: TickUnit;
  step: number;
  approx: number;
}

const MONTH_APPROX = 30.436875 * DAY;
const YEAR_APPROX = 365.2425 * DAY;
const INTERVALS: readonly Interval_[] = [
  { unit: 'minute', step: 1, approx: MINUTE },
  { unit: 'minute', step: 5, approx: 5 * MINUTE },
  { unit: 'minute', step: 15, approx: 15 * MINUTE },
  { unit: 'minute', step: 30, approx: 30 * MINUTE },
  { unit: 'hour', step: 1, approx: HOUR },
  { unit: 'hour', step: 3, approx: 3 * HOUR },
  { unit: 'hour', step: 6, approx: 6 * HOUR },
  { unit: 'hour', step: 12, approx: 12 * HOUR },
  { unit: 'day', step: 1, approx: DAY },
  { unit: 'day', step: 2, approx: 2 * DAY },
  { unit: 'week', step: 1, approx: 7 * DAY },
  { unit: 'month', step: 1, approx: MONTH_APPROX },
  { unit: 'month', step: 3, approx: 3 * MONTH_APPROX },
  { unit: 'month', step: 6, approx: 6 * MONTH_APPROX },
  { unit: 'year', step: 1, approx: YEAR_APPROX },
];
const MAX_TICKS = 2000;

export function createTimeScale(options: TimeScaleOptions): TimeScale {
  const { start, end, x0, x1, timeZone } = options;
  if (![start, end, x0, x1].every(Number.isFinite)) {
    throw new RangeError('createTimeScale: start, end, x0 and x1 must be finite');
  }
  if (start === end) throw new RangeError('createTimeScale: start and end must differ');
  if (x0 === x1) throw new RangeError('createTimeScale: x0 and x1 must differ');
  const pxPerMs = (x1 - x0) / (end - start);
  return {
    start,
    end,
    x0,
    x1,
    timeZone,
    pxPerMs,
    toX: (ts) => x0 + (ts - start) * pxPerMs,
    toTime: (x) => Math.round(start + (x - x0) / pxPerMs),
    ticks: (count = 8) => timeTicks(Math.min(start, end), Math.max(start, end), count, timeZone).map(
      (tick) => ({ ...tick, x: x0 + (tick.ts - start) * pxPerMs }),
    ),
  };
}

/** Picks the tick interval closest to `(to - from) / count` and lists aligned ticks in [from, to]. */
export function timeTicks(
  from: Timestamp,
  to: Timestamp,
  count: number,
  timeZone: TimeZone,
): TimeTick[] {
  const target = (to - from) / Math.max(1, count);
  let interval = INTERVALS[INTERVALS.length - 1] as Interval_;
  for (const candidate of INTERVALS) {
    if (candidate.approx >= target) {
      interval = candidate;
      break;
    }
  }
  if (interval.unit === 'year') {
    interval = { unit: 'year', step: niceYears(target / YEAR_APPROX), approx: YEAR_APPROX };
  }
  const out: TimeTick[] = [];
  let k = 0;
  let previous = -Infinity;
  for (let ts = floorTo(from, interval, timeZone); ts <= to && out.length < MAX_TICKS; ) {
    if (ts >= from && ts > previous) {
      out.push({ ts, x: 0, unit: interval.unit, major: isMajor(ts, interval, timeZone) });
    }
    previous = ts;
    k++;
    ts = advance(floorTo(from, interval, timeZone), interval, k, timeZone);
  }
  return out;
}

function niceYears(years: number): number {
  if (years <= 1) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(years)));
  for (const m of [1, 2, 5, 10]) if (m * magnitude >= years) return m * magnitude;
  return 10 * magnitude;
}

/** Latest aligned boundary at or before `ts`. */
function floorTo(ts: Timestamp, interval: Interval_, timeZone: TimeZone): Timestamp {
  const p = zonedParts(ts, timeZone);
  const { step } = interval;
  switch (interval.unit) {
    case 'minute':
      return fromZoned(
        { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute - (p.minute % step) },
        timeZone,
      );
    case 'hour':
      return fromZoned(
        { year: p.year, month: p.month, day: p.day, hour: p.hour - (p.hour % step) },
        timeZone,
      );
    case 'day': {
      // Align multi-day steps on a fixed epoch-based grid so ticks do not jitter while panning.
      const dayIndex = Math.floor(Date.UTC(p.year, p.month - 1, p.day) / DAY);
      const offset = ((dayIndex % step) + step) % step;
      return fromZoned({ year: p.year, month: p.month, day: p.day - offset }, timeZone);
    }
    case 'week':
      return startOfWeek(ts, timeZone, 1);
    case 'month': {
      const monthIndex = p.year * 12 + (p.month - 1);
      const aligned = monthIndex - (monthIndex % step);
      return fromZoned({ year: Math.floor(aligned / 12), month: (aligned % 12) + 1, day: 1 }, timeZone);
    }
    case 'year':
      return fromZoned({ year: p.year - (((p.year % step) + step) % step), month: 1, day: 1 }, timeZone);
  }
}

/** The `k`-th boundary after `base`, stepping in wall-clock time (DST-safe). */
function advance(base: Timestamp, interval: Interval_, k: number, timeZone: TimeZone): Timestamp {
  const p = zonedParts(base, timeZone);
  const n = interval.step * k;
  switch (interval.unit) {
    case 'minute':
      // Minutes and hours step in absolute time: wall-clock stepping would skip or repeat
      // an hour at DST changes, while absolute steps stay evenly spaced on the axis.
      return base + n * MINUTE;
    case 'hour':
      return base + n * HOUR;
    case 'day':
      return fromZoned({ year: p.year, month: p.month, day: p.day + n }, timeZone);
    case 'week':
      return fromZoned({ year: p.year, month: p.month, day: p.day + 7 * k }, timeZone);
    case 'month':
      return fromZoned({ year: p.year, month: p.month + n, day: 1 }, timeZone);
    case 'year':
      return fromZoned({ year: p.year + n, month: 1, day: 1 }, timeZone);
  }
}

function isMajor(ts: Timestamp, interval: Interval_, timeZone: TimeZone): boolean {
  const p = zonedParts(ts, timeZone);
  switch (interval.unit) {
    case 'minute':
      return p.minute === 0;
    case 'hour':
      return p.hour === 0 && p.minute === 0;
    case 'day':
      return p.day === 1;
    case 'week':
      return p.day <= 7;
    case 'month':
      return p.month === 1;
    case 'year':
      return p.year % (interval.step * 10) === 0;
  }
}

export interface DragToDueOptions {
  /** Snap the due date: a step in milliseconds (e.g. `15 * MINUTE`) or local midnight (`'day'`). */
  snap?: number | 'day';
}

/**
 * Result of dragging a node to `newX` on a timeline: the node with its new `x` and `due`.
 * When snapping, `x` is snapped too so the node lands exactly on the slot.
 */
export function dragToDue(
  node: GraphNode,
  newX: number,
  scale: TimeScale,
  options: DragToDueOptions = {},
): GraphNode {
  let due = scale.toTime(newX);
  if (options.snap === 'day') {
    const p = zonedParts(due, scale.timeZone);
    const day = fromZoned({ year: p.year, month: p.month, day: p.day }, scale.timeZone);
    const next = fromZoned({ year: p.year, month: p.month, day: p.day + 1 }, scale.timeZone);
    due = due - day < next - due ? day : next;
  } else if (typeof options.snap === 'number' && options.snap > 0) {
    // Fixed steps are anchored on the scale start so the grid matches the drawn ticks.
    due = scale.start + Math.round((due - scale.start) / options.snap) * options.snap;
  }
  const x = options.snap === undefined ? newX : scale.toX(due);
  return { ...node, x, due };
}

/** Moves every node that has a due date onto the timeline (`x = toX(due)`); `y` is kept. */
export function placeOnTimeline<G extends GraphLike>(graph: G, scale: TimeScale): G {
  let changed = false;
  const nodes = graph.nodes.map((node) => {
    if (node.due === undefined) return node;
    const x = scale.toX(node.due);
    if (x === node.x) return node;
    changed = true;
    return { ...node, x };
  });
  return changed ? { ...graph, nodes } : graph;
}
