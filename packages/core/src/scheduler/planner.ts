/**
 * Internal placement engine shared by `route` (1.1) and `magnetize` (1.10).
 *
 * Tasks are placed one by one, in the caller's order, into the free slots of a list of
 * working days. A placement removes its interval from the free slots, so placements never
 * overlap each other. The engine is deterministic: same input, same output.
 */
import type { Interval, Task, Timestamp, TimeZone } from '../model.ts';
import { MINUTE, freeSlots } from '../time.ts';
import type {
  EnergyProfile,
  Placement,
  PlacementReason,
  RouteOptions,
  RouteWarning,
  Unplaced,
  UnplacedReason,
} from './types.ts';
import {
  alignUp,
  floorToMinute,
  hourLookup,
  intersect,
  overlapMs,
  subtract,
  type LocalDay,
} from './calendar.ts';

const MIN_CHUNK_MIN = 25;
/** Energy scores closer than this are ties (the earliest slot wins). */
const SCORE_EPSILON = 1e-9;

export interface PlannerSettings {
  stepMs: number;
  defaultEstimateMs: number;
  split: boolean;
  minChunkMs: number;
  capMs?: number;
  energy?: readonly number[];
  insightOffPeak: boolean;
}

export interface PlanDay {
  key: string;
  /** Length of the full working window, used to tell "too long" from "no room". */
  windowMs: number;
  /** Sorted, disjoint free slots inside the usable part of the window. */
  free: Interval[];
  /** Focused work already booked on the local calendar day. */
  loadMs: number;
  hourAt: (ts: Timestamp) => number;
}

export interface PlanOutcome {
  placements: Placement[];
  unplaced: Unplaced[];
  warnings: RouteWarning[];
}

interface DayBuildInput {
  day: LocalDay;
  window: Interval;
  /** Part of the timeline that may be used (planning range, not before `now`). */
  bounds: Interval;
  busy: readonly Interval[];
  /** Merged focus intervals. */
  focus: readonly Interval[];
  timeZone: TimeZone;
}

export function buildPlanDay(input: DayBuildInput): PlanDay | undefined {
  const usable = intersect(input.window, input.bounds);
  if (!usable) return undefined;
  return {
    key: input.day.key,
    windowMs: input.window.end - input.window.start,
    free: freeSlots(usable, input.busy).filter((s) => s.end > s.start),
    loadMs: overlapMs({ start: input.day.start, end: input.day.end }, input.focus),
    hourAt: hourLookup(input.window, input.timeZone),
  };
}

export function resolveSettings(
  options: RouteOptions | undefined,
  energy: readonly number[] | undefined,
): PlannerSettings {
  const o = options ?? {};
  const granularity = Math.min(60, Math.max(1, Math.round(o.granularityMin ?? 5)));
  const settings: PlannerSettings = {
    stepMs: granularity * MINUTE,
    defaultEstimateMs: (positive(o.defaultEstimateMin) ?? 30) * MINUTE,
    split: o.split === true,
    minChunkMs: Math.max(MIN_CHUNK_MIN, positive(o.minChunkMin) ?? MIN_CHUNK_MIN) * MINUTE,
    insightOffPeak: o.insightOffPeak === true,
  };
  const cap = positive(o.dailyCapMin);
  if (cap !== undefined) settings.capMs = cap * MINUTE;
  if (energy) settings.energy = energy;
  return settings;
}

/** Validates and clamps a 24-value energy profile; reports and drops an invalid one. */
export function readEnergyProfile(
  profile: EnergyProfile | undefined,
  warnings: RouteWarning[],
): number[] | undefined {
  if (profile === undefined) return undefined;
  if (profile.length !== 24 || !profile.every((v) => Number.isFinite(v))) {
    warnings.push({ kind: 'invalid-energy-profile' });
    return undefined;
  }
  return profile.map((v) => Math.min(1, Math.max(0, v)));
}

export function overloadWarnings(days: readonly PlanDay[], s: PlannerSettings): RouteWarning[] {
  if (s.capMs === undefined) return [];
  const capMin = s.capMs / MINUTE;
  return days
    .filter((d) => s.capMs !== undefined && d.loadMs > s.capMs)
    .map((d) => ({ kind: 'overload', day: d.key, loadMin: d.loadMs / MINUTE, capMin }));
}

/** Places `ordered` tasks into `days` (mutated) and reports what could not be placed. */
export function planTasks(
  ordered: readonly Task[],
  days: readonly PlanDay[],
  s: PlannerSettings,
): PlanOutcome {
  const out: PlanOutcome = { placements: [], unplaced: [], warnings: [] };
  for (const task of ordered) placeTask(task, days, s, out);
  out.placements.sort(
    (a, b) => a.start - b.start || (a.taskId < b.taskId ? -1 : a.taskId > b.taskId ? 1 : 0),
  );
  return out;
}

/* ------------------------------------------------------------------------------------------ */

interface Spot {
  day: PlanDay;
  start: Timestamp;
}

interface Chunk extends Spot {
  end: Timestamp;
}

interface EnergyTarget {
  reason: Extract<PlacementReason, 'energy' | 'insight-off-peak'>;
  prefersHigh: boolean;
}

function placeTask(task: Task, days: readonly PlanDay[], s: PlannerSettings, out: PlanOutcome) {
  const dur = taskDurationMs(task, s);
  const earliest = findEarliest(days, dur, s);
  const wholeEnd = earliest.spot ? earliest.spot.start + dur : undefined;
  const late = wholeEnd !== undefined && task.deadline !== undefined && wholeEnd > task.deadline;
  let capBlocked = earliest.capBlocked;
  const splittable = s.split && dur >= 2 * s.minChunkMs;

  if (splittable && (!earliest.spot || late)) {
    const split = findChunks(days, dur, s);
    capBlocked ||= split.capBlocked;
    const last = split.chunks?.at(-1);
    if (split.chunks && last && (wholeEnd === undefined || last.end < wholeEnd)) {
      commitChunks(task, split.chunks, out);
      return;
    }
  }

  if (!earliest.spot) {
    out.unplaced.push({ taskId: task.id, reason: unplacedReason(dur, days, splittable, capBlocked) });
    return;
  }

  const { day } = earliest.spot;
  let start = earliest.spot.start;
  let reason: PlacementReason = late ? 'deadline' : 'earliest';
  const target = late ? undefined : energyTarget(task, s);
  if (target && s.energy) {
    start = bestEnergyStart(day, dur, target, task.deadline, s.energy, s.stepMs) ?? start;
    reason = target.reason;
  }
  commit(day, { start, end: start + dur });
  out.placements.push({ taskId: task.id, start, end: start + dur, reason });
  warnIfLate(task, start + dur, out);
}

function taskDurationMs(task: Task, s: PlannerSettings): number {
  const est = positive(task.estimateMin);
  return est !== undefined ? est * MINUTE : s.defaultEstimateMs;
}

function unplacedReason(
  dur: number,
  days: readonly PlanDay[],
  splittable: boolean,
  capBlocked: boolean,
): UnplacedReason {
  if (capBlocked) return 'over-capacity';
  const longest = Math.max(0, ...days.map((d) => d.windowMs));
  if (!splittable && days.length > 0 && dur > longest) return 'too-long';
  return 'no-slot';
}

function capAllows(day: PlanDay, extraMs: number, s: PlannerSettings): boolean {
  return s.capMs === undefined || day.loadMs + extraMs <= s.capMs;
}

function findEarliest(
  days: readonly PlanDay[],
  dur: number,
  s: PlannerSettings,
): { spot?: Spot; capBlocked: boolean } {
  let capBlocked = false;
  for (const day of days) {
    const start = firstFit(day.free, dur, s.stepMs);
    if (start === undefined) continue;
    if (!capAllows(day, dur, s)) {
      capBlocked = true;
      continue;
    }
    return { spot: { day, start }, capBlocked };
  }
  return { capBlocked };
}

function firstFit(free: readonly Interval[], dur: number, stepMs: number): Timestamp | undefined {
  for (const slot of free) {
    const start = alignUp(slot.start, stepMs);
    if (start + dur <= slot.end) return start;
  }
  return undefined;
}

/**
 * Greedy earliest chunking: at most one chunk per free slot, each at least `minChunkMs`,
 * never leaving a remainder shorter than `minChunkMs`. All-or-nothing.
 */
function findChunks(
  days: readonly PlanDay[],
  dur: number,
  s: PlannerSettings,
): { chunks?: Chunk[]; capBlocked: boolean } {
  const chunks: Chunk[] = [];
  let remaining = dur;
  let capBlocked = false;
  for (const day of days) {
    let dayLoad = day.loadMs;
    for (const slot of day.free) {
      if (remaining <= 0) break;
      const start = alignUp(slot.start, s.stepMs);
      const room = floorToMinute(slot.end - start);
      if (room < s.minChunkMs) continue;
      const capRoom =
        s.capMs === undefined ? Number.POSITIVE_INFINITY : floorToMinute(s.capMs - dayLoad);
      if (capRoom < s.minChunkMs) {
        capBlocked = true;
        break;
      }
      const take = chunkLength(remaining, Math.min(room, capRoom), s.minChunkMs);
      if (take === undefined) continue;
      chunks.push({ day, start, end: start + take });
      remaining -= take;
      dayLoad += take;
    }
    if (remaining <= 0) break;
  }
  return remaining <= 0 ? { chunks, capBlocked } : { capBlocked };
}

function chunkLength(remaining: number, room: number, minChunk: number): number | undefined {
  let take = Math.min(remaining, room);
  const rest = remaining - take;
  if (rest > 0 && rest < minChunk) take = remaining - minChunk;
  return take >= minChunk ? take : undefined;
}

function commitChunks(task: Task, chunks: readonly Chunk[], out: PlanOutcome) {
  chunks.forEach((c, index) => {
    commit(c.day, c);
    out.placements.push({
      taskId: task.id,
      start: c.start,
      end: c.end,
      reason: 'split',
      chunk: { index, count: chunks.length },
    });
  });
  const last = chunks[chunks.length - 1];
  if (last) warnIfLate(task, last.end, out);
}

function commit(day: PlanDay, interval: Interval) {
  day.free = subtract(day.free, interval);
  day.loadMs += interval.end - interval.start;
}

function warnIfLate(task: Task, end: Timestamp, out: PlanOutcome) {
  if (task.deadline !== undefined && end > task.deadline) {
    out.warnings.push({ kind: 'deadline-missed', taskId: task.id, deadline: task.deadline, end });
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Energy matching                                                                             */
/* ------------------------------------------------------------------------------------------ */

function energyTarget(task: Task, s: PlannerSettings): EnergyTarget | undefined {
  if (!s.energy) return undefined;
  if (s.insightOffPeak && task.mode === 'create' && task.energy !== 'high') {
    return { reason: 'insight-off-peak', prefersHigh: false };
  }
  if (task.energy === 'high' || (task.energy === undefined && task.mode === 'create')) {
    return { reason: 'energy', prefersHigh: true };
  }
  if (task.energy === 'low') return { reason: 'energy', prefersHigh: false };
  return undefined;
}

/** Best-matching start on `day` that still meets the deadline; ties go to the earliest. */
function bestEnergyStart(
  day: PlanDay,
  dur: number,
  target: EnergyTarget,
  deadline: Timestamp | undefined,
  energy: readonly number[],
  stepMs: number,
): Timestamp | undefined {
  let best: Timestamp | undefined;
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const slot of day.free) {
    for (let start = alignUp(slot.start, stepMs); start + dur <= slot.end; start += stepMs) {
      if (deadline !== undefined && start + dur > deadline) return best;
      const score = energyScore(day, start, dur, energy, stepMs);
      const value = target.prefersHigh ? score : -score;
      if (value > bestValue + SCORE_EPSILON) {
        best = start;
        bestValue = value;
      }
    }
  }
  return best;
}

/** Time-weighted mean energy over `[start, start + dur)`, sampled at each step's midpoint. */
function energyScore(
  day: PlanDay,
  start: Timestamp,
  dur: number,
  energy: readonly number[],
  stepMs: number,
): number {
  let total = 0;
  for (let t = start; t < start + dur; t += stepMs) {
    const len = Math.min(stepMs, start + dur - t);
    total += (energy[day.hourAt(t + len / 2)] ?? 0) * len;
  }
  return total / dur;
}

function positive(v: number | undefined): number | undefined {
  return v !== undefined && Number.isFinite(v) && v > 0 ? v : undefined;
}
