/**
 * Energy heatmap (feature 1.3) and the hourly energy profile consumed by the scheduler.
 *
 * Evidence is the user's own execution history: focus time logs (`TimeLog.kind === 'focus'`)
 * and task completions, binned by local weekday × hour in the user's zone.
 *
 * Model — per cell `c` (a weekday/hour slot, or an hour of day for the profile):
 * - `X_c` is the recency-weighted evidence in hour-equivalents (one focus hour = 1, one
 *   completion = `completionWeight`); `E_c` is the recency-weighted number of hours the slot
 *   was observed (tracking active). Weights decay exponentially by week of age.
 * - A Gamma–Poisson (credibility) model shrinks the observed rate `X_c / E_c` toward a prior
 *   circadian curve `p_c`: the prior holds `priorStrength` hour-equivalents per cell, its mean
 *   rate is `p_c` scaled to the user's overall volume (empirical Bayes), so
 *   `rate_c = (α_c + X_c) / (β + E_c)` with `α_c = κ·p_c/Σp`, `κ = priorStrength·cells`,
 *   `β = κ·Σ(p·E) / (N·Σp)`, `N = ΣX`.
 * - `confidence_c = E_c / (E_c + β)` is the credibility factor: the share of the estimate that
 *   comes from the cell's own data. With uniform exposure it equals `N / (N + κ)`; a slot never
 *   observed (tracking started later) has confidence 0 and shows the prior.
 * Values are normalised to the best cell (0..1).
 */
import type { Interval, Task, TimeZone, Timestamp } from '../model.ts';
import { HOUR, MINUTE, mergeIntervals, zonedParts } from '../time.ts';
import { assertFiniteTimestamp, clip, completedAt, focusLogs, sum, WEEK } from './internal.ts';

/* ------------------------------------------------------------------------------------------ */
/* Chronotype priors                                                                           */
/* ------------------------------------------------------------------------------------------ */

export type Chronotype = 'morning' | 'intermediate' | 'evening';

export const CHRONOTYPES: readonly Chronotype[] = ['morning', 'intermediate', 'evening'];

/** The five categories of the Morningness–Eveningness Questionnaire (Horne & Östberg, 1976). */
export type MeqCategory =
  | 'definite-morning'
  | 'moderate-morning'
  | 'neither'
  | 'moderate-evening'
  | 'definite-evening';

/**
 * MEQ category of a total score (16–86), using the cut-offs of Horne & Östberg (1976):
 * 70–86 definite morning, 59–69 moderate morning, 42–58 neither, 31–41 moderate evening,
 * 16–30 definite evening.
 */
export function meqCategory(score: number): MeqCategory {
  if (!Number.isFinite(score) || score < 16 || score > 86) {
    throw new RangeError('MEQ score must be between 16 and 86');
  }
  if (score >= 70) return 'definite-morning';
  if (score >= 59) return 'moderate-morning';
  if (score >= 42) return 'neither';
  if (score >= 31) return 'moderate-evening';
  return 'definite-evening';
}

/** Collapses an MEQ score onto the three prior curves. */
export function chronotypeFromMeq(score: number): Chronotype {
  const category = meqCategory(score);
  if (category === 'neither') return 'intermediate';
  return category.endsWith('morning') ? 'morning' : 'evening';
}

interface Peak {
  /** Hour of day of the peak centre. */
  at: number;
  height: number;
  /** Standard deviation, in hours. */
  width: number;
}

/**
 * Hand-tuned prior shapes: a main peak plus a secondary one, with a dip in between and low
 * values at night, shifted earlier or later by chronotype. They are product heuristics meant
 * to keep sparse data sane — not curves fitted to any published dataset.
 */
const PRIOR_SHAPES: { readonly [K in Chronotype]: readonly Peak[] } = {
  morning: [
    { at: 9, height: 1, width: 2 },
    { at: 15, height: 0.55, width: 2.25 },
  ],
  intermediate: [
    { at: 10.5, height: 1, width: 2 },
    { at: 16, height: 0.7, width: 2.25 },
  ],
  evening: [
    { at: 17, height: 1, width: 2.5 },
    { at: 11.5, height: 0.6, width: 2 },
  ],
};

/** Minimum prior value so that no hour is ever impossible. */
export const PRIOR_FLOOR = 0.03;

/**
 * Prior circadian energy curve for a chronotype: 24 values in `[PRIOR_FLOOR, 1]`, index = local
 * hour (value evaluated at the middle of the hour), peak = 1.
 */
export function circadianPrior(chronotype: Chronotype = 'intermediate'): number[] {
  const peaks = PRIOR_SHAPES[chronotype];
  if (!peaks) throw new RangeError(`Unknown chronotype: ${String(chronotype)}`);
  const raw: number[] = [];
  for (let h = 0; h < 24; h++) {
    const x = h + 0.5;
    let v = 0;
    for (const p of peaks) {
      const d = Math.abs(x - p.at);
      const circular = Math.min(d, 24 - d);
      v += p.height * Math.exp(-0.5 * (circular / p.width) ** 2);
    }
    raw.push(v);
  }
  const max = Math.max(...raw);
  return raw.map((v) => PRIOR_FLOOR + ((1 - PRIOR_FLOOR) * v) / max);
}

/* ------------------------------------------------------------------------------------------ */
/* Public types                                                                                */
/* ------------------------------------------------------------------------------------------ */

export interface EnergyInput {
  tasks: readonly Task[];
  now: Timestamp;
  timeZone: TimeZone;
  /** Look-back window, in weeks (default 4). */
  weeks?: number;
  /** Prior curve to shrink toward (default `'intermediate'`). Ignored when `prior` is given. */
  chronotype?: Chronotype;
  /** Custom prior: 24 non-negative values indexed by local hour (not all zero). */
  prior?: readonly number[];
  /** Pseudo-evidence held by the prior, in hour-equivalents per cell (default 0.1). */
  priorStrength?: number;
  /** Recency half-life in weeks: evidence `w` weeks old weighs `0.5^(w/halfLife)` (default 2). */
  halfLifeWeeks?: number;
  /** Hour-equivalents of evidence credited per completed task (default 0.25). */
  completionWeight?: number;
  /**
   * Start of tracking. Slots before it are "not observed" rather than "observed idle".
   * Default: the earliest `createdAt`, focus log or completion among `tasks`.
   */
  since?: Timestamp;
  /** Confidence from which a cell is considered backed by enough data (default 0.5). */
  minConfidence?: number;
}

export interface EnergyHourCell {
  /** Local hour, 0–23. */
  hour: number;
  /** Posterior energy, 0..1 relative to the best cell. */
  value: number;
  /** Prior value for this hour, 0..1. */
  prior: number;
  /** Raw observed rate, 0..1 relative to the best observed cell; `null` if never observed. */
  observed: number | null;
  /** Raw observations in the cell: focus blocks touching it + completions in it. */
  samples: number;
  /** Unweighted hours the slot was observed (≈ number of occurrences seen). */
  exposure: number;
  /** Credibility 0..1: share of `value` that comes from this cell's own data. */
  confidence: number;
  /** `confidence >= minConfidence`; when false the UI should say "not enough data yet". */
  enoughData: boolean;
}

export interface EnergyCell extends EnergyHourCell {
  /** 0 = Sunday … 6 = Saturday (same convention as `zonedParts`). */
  weekday: number;
}

interface EnergySummary {
  /** Prior curve used (24 values, 0..1). */
  prior: number[];
  /** Global shrinkage weight `N / (N + κ)`: how data-driven the estimate is overall. */
  dataWeight: number;
  /** `dataWeight >= minConfidence`. */
  enoughData: boolean;
  /** Raw observations (focus blocks per slot + completions) in the window. */
  samples: number;
  /** Unweighted focus minutes in the window. */
  focusMinutes: number;
  /** Completions in the window. */
  completions: number;
  /** Observed span (tracking start or window start → now), `null` if empty. */
  observed: Interval | null;
}

export interface EnergyHeatmap extends EnergySummary {
  /** `cells[weekday][hour]`, weekday 0 = Sunday. */
  cells: EnergyCell[][];
  /** `values[weekday][hour]` — the posterior values only. */
  values: number[][];
  /** Best cell, or `null` when there is nothing to rank. */
  peak: { weekday: number; hour: number } | null;
}

export interface EnergyByHourInput extends EnergyInput {
  /** Weekdays pooled into the profile (default all; e.g. working days `[1,2,3,4,5]`). */
  days?: readonly number[];
}

export interface EnergyByHour extends EnergySummary {
  /** 24 cells, index = local hour. */
  cells: EnergyHourCell[];
  /** 24 posterior values, 0..1. */
  values: number[];
  /** Best hour, or `null`. */
  peak: number | null;
}

/* ------------------------------------------------------------------------------------------ */
/* Implementation                                                                              */
/* ------------------------------------------------------------------------------------------ */

interface Options {
  weeks: number;
  prior: number[];
  priorStrength: number;
  halfLifeWeeks: number;
  completionWeight: number;
  minConfidence: number;
}

function resolveOptions(input: EnergyInput): Options {
  assertFiniteTimestamp(input.now, 'now');
  const weeks = input.weeks ?? 4;
  if (!Number.isInteger(weeks) || weeks < 1) throw new RangeError('weeks must be an integer >= 1');
  const priorStrength = input.priorStrength ?? 0.1;
  if (!(priorStrength > 0) || !Number.isFinite(priorStrength)) {
    throw new RangeError('priorStrength must be > 0');
  }
  const halfLifeWeeks = input.halfLifeWeeks ?? 2;
  if (!(halfLifeWeeks > 0)) throw new RangeError('halfLifeWeeks must be > 0');
  const completionWeight = input.completionWeight ?? 0.25;
  if (!(completionWeight >= 0) || !Number.isFinite(completionWeight)) {
    throw new RangeError('completionWeight must be >= 0');
  }
  const minConfidence = input.minConfidence ?? 0.5;
  if (!(minConfidence >= 0 && minConfidence <= 1)) {
    throw new RangeError('minConfidence must be within [0, 1]');
  }
  let prior: number[];
  if (input.prior) {
    if (input.prior.length !== 24) throw new RangeError('prior must have 24 values');
    if (input.prior.some((v) => !Number.isFinite(v) || v < 0)) {
      throw new RangeError('prior values must be finite and >= 0');
    }
    const max = Math.max(...input.prior);
    if (max <= 0) throw new RangeError('prior must not be all zeros');
    prior = input.prior.map((v) => v / max);
  } else {
    prior = circadianPrior(input.chronotype ?? 'intermediate');
  }
  return { weeks, prior, priorStrength, halfLifeWeeks, completionWeight, minConfidence };
}

interface Slot {
  start: Timestamp;
  end: Timestamp;
  weekday: number;
  hour: number;
  /** Recency weight. */
  weight: number;
}

/** Local-hour slots covering `[start, end)` (DST-aware: a repeated hour yields two slots). */
function hourSlots(start: Timestamp, end: Timestamp, now: Timestamp, o: Options, tz: TimeZone) {
  const slots: Slot[] = [];
  let t = start;
  while (t < end) {
    const p = zonedParts(t, tz);
    const intoHour = (p.minute * 60 + p.second) * 1000 + (((t % 1000) + 1000) % 1000);
    const boundary = t - intoHour + HOUR;
    const slotEnd = Math.min(boundary > t ? boundary : t + HOUR, end);
    const age = now - (t + slotEnd) / 2;
    const weekIndex = Math.max(0, Math.floor(age / WEEK));
    slots.push({
      start: t,
      end: slotEnd,
      weekday: p.weekday,
      hour: p.hour,
      weight: 0.5 ** (weekIndex / o.halfLifeWeeks),
    });
    t = slotEnd;
  }
  return slots;
}

function trackingStart(tasks: readonly Task[]): Timestamp | undefined {
  let min = Infinity;
  for (const task of tasks) {
    if (Number.isFinite(task.createdAt)) min = Math.min(min, task.createdAt);
    for (const log of focusLogs(task)) min = Math.min(min, log.start);
    const done = completedAt(task);
    if (done !== undefined && Number.isFinite(done)) min = Math.min(min, done);
  }
  return Number.isFinite(min) ? min : undefined;
}

interface Accumulated {
  /** Weighted evidence per cell, hour-equivalents. */
  x: number[];
  /** Weighted exposure per cell, hours. */
  e: number[];
  /** Unweighted exposure per cell, hours. */
  exposure: number[];
  samples: number[];
  focusMinutes: number;
  completions: number;
  observed: Interval | null;
}

/** Bins the evidence of `tasks` into `cellCount` cells via `cellOf` (−1 = slot excluded). */
function accumulate(
  input: EnergyInput,
  o: Options,
  cellCount: number,
  cellOf: (slot: Slot) => number,
): Accumulated {
  const acc: Accumulated = {
    x: new Array<number>(cellCount).fill(0),
    e: new Array<number>(cellCount).fill(0),
    exposure: new Array<number>(cellCount).fill(0),
    samples: new Array<number>(cellCount).fill(0),
    focusMinutes: 0,
    completions: 0,
    observed: null,
  };
  const { now, timeZone, tasks } = input;
  const windowStart = now - o.weeks * WEEK;
  const since = input.since ?? trackingStart(tasks);
  if (since === undefined) return acc;
  assertFiniteTimestamp(since, 'since');
  const start = Math.max(windowStart, since);
  if (start >= now) return acc;
  const range: Interval = { start, end: now };
  acc.observed = range;

  const slots = hourSlots(start, now, now, o, timeZone);
  const cells = slots.map(cellOf);

  // Exposure.
  slots.forEach((slot, i) => {
    const c = cells[i] as number;
    if (c < 0) return;
    const hours = (slot.end - slot.start) / HOUR;
    acc.e[c] = (acc.e[c] as number) + hours * slot.weight;
    acc.exposure[c] = (acc.exposure[c] as number) + hours;
  });

  // Focus evidence: merged across tasks so overlapping logs never count twice.
  const raw: Interval[] = [];
  for (const task of tasks) {
    for (const log of focusLogs(task)) {
      const part = clip(log, range);
      if (part) raw.push(part);
    }
  }
  const focus = mergeIntervals(raw);
  let j = 0;
  slots.forEach((slot, i) => {
    const c = cells[i] as number;
    while (j < focus.length && (focus[j] as Interval).end <= slot.start) j++;
    for (let k = j; k < focus.length; k++) {
      const f = focus[k] as Interval;
      if (f.start >= slot.end) break;
      const overlap = Math.min(f.end, slot.end) - Math.max(f.start, slot.start);
      if (overlap <= 0) continue;
      acc.focusMinutes += overlap / MINUTE;
      if (c < 0) continue;
      acc.x[c] = (acc.x[c] as number) + (overlap / HOUR) * slot.weight;
      acc.samples[c] = (acc.samples[c] as number) + 1;
    }
  });

  // Completions.
  for (const task of tasks) {
    const done = completedAt(task);
    if (done === undefined || done < start || done >= now) continue;
    const i = findSlot(slots, done);
    if (i < 0) continue;
    acc.completions++;
    const c = cells[i] as number;
    if (c < 0) continue;
    const slot = slots[i] as Slot;
    acc.x[c] = (acc.x[c] as number) + o.completionWeight * slot.weight;
    acc.samples[c] = (acc.samples[c] as number) + 1;
  }
  return acc;
}

function findSlot(slots: readonly Slot[], t: Timestamp): number {
  let lo = 0;
  let hi = slots.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = slots[mid] as Slot;
    if (t < s.start) hi = mid - 1;
    else if (t >= s.end) lo = mid + 1;
    else return mid;
  }
  return -1;
}

interface Estimate {
  values: number[];
  observed: Array<number | null>;
  confidence: number[];
  dataWeight: number;
}

/** Credibility-weighted (Gamma–Poisson) shrinkage of the observed rates toward the prior. */
function shrink(prior: readonly number[], acc: Accumulated, priorStrength: number): Estimate {
  const n = prior.length;
  const kappa = priorStrength * n;
  const total = sum(acc.x);
  const priorSum = sum(prior);
  let priorExposure = 0;
  for (let c = 0; c < n; c++) priorExposure += (prior[c] as number) * (acc.e[c] as number);

  const rates: number[] = [];
  const confidence: number[] = [];
  let dataWeight = 0;
  if (total > 0 && priorExposure > 0) {
    // Prior mean rate = p_c · total / Σ(p·E); prior mass κ split along p.
    const beta = (kappa * priorExposure) / (total * priorSum);
    for (let c = 0; c < n; c++) {
      const e = acc.e[c] as number;
      const alpha = (kappa * (prior[c] as number)) / priorSum;
      rates.push((alpha + (acc.x[c] as number)) / (beta + e));
      confidence.push(e / (e + beta));
    }
    dataWeight = total / (total + kappa);
  } else {
    for (let c = 0; c < n; c++) {
      rates.push(prior[c] as number);
      confidence.push(0);
    }
  }
  const maxRate = Math.max(...rates);
  const values = rates.map((r) => (maxRate > 0 ? r / maxRate : 0));

  const observedRates = acc.e.map((e, c) => (e > 0 ? (acc.x[c] as number) / e : null));
  let maxObserved = 0;
  for (const r of observedRates) if (r !== null && r > maxObserved) maxObserved = r;
  const observed = observedRates.map((r) => (r === null ? null : maxObserved > 0 ? r / maxObserved : 0));
  return { values, observed, confidence, dataWeight };
}

function argmax(values: readonly number[]): number {
  let best = -1;
  let bestValue = -Infinity;
  values.forEach((v, i) => {
    if (v > bestValue) {
      bestValue = v;
      best = i;
    }
  });
  return best;
}

function summary(o: Options, acc: Accumulated, est: Estimate): EnergySummary {
  return {
    prior: [...o.prior],
    dataWeight: est.dataWeight,
    enoughData: est.dataWeight >= o.minConfidence && est.dataWeight > 0,
    samples: sum(acc.samples),
    focusMinutes: acc.focusMinutes,
    completions: acc.completions,
    observed: acc.observed,
  };
}

function hourCell(o: Options, acc: Accumulated, est: Estimate, c: number, hour: number) {
  const confidence = est.confidence[c] as number;
  return {
    hour,
    value: est.values[c] as number,
    prior: o.prior[hour] as number,
    observed: est.observed[c] as number | null,
    samples: acc.samples[c] as number,
    exposure: acc.exposure[c] as number,
    confidence,
    enoughData: confidence > 0 && confidence >= o.minConfidence,
  };
}

/**
 * 7×24 energy heatmap from the last `weeks` weeks of focus logs and completions, shrunk toward
 * a circadian prior. `cells[weekday][hour]`, weekday 0 = Sunday.
 */
export function energyHeatmap(input: EnergyInput): EnergyHeatmap {
  const o = resolveOptions(input);
  const acc = accumulate(input, o, 7 * 24, (slot) => slot.weekday * 24 + slot.hour);
  const prior168: number[] = [];
  for (let d = 0; d < 7; d++) prior168.push(...o.prior);
  const est = shrink(prior168, acc, o.priorStrength);

  const cells: EnergyCell[][] = [];
  const values: number[][] = [];
  for (let d = 0; d < 7; d++) {
    const row: EnergyCell[] = [];
    for (let h = 0; h < 24; h++) {
      row.push({ weekday: d, ...hourCell(o, acc, est, d * 24 + h, h) });
    }
    cells.push(row);
    values.push(row.map((c) => c.value));
  }
  const best = argmax(est.values);
  return {
    ...summary(o, acc, est),
    cells,
    values,
    peak: best < 0 ? null : { weekday: Math.floor(best / 24), hour: best % 24 },
  };
}

/**
 * Hour-of-day energy profile pooled over `days` (default every weekday), with the same
 * shrinkage and per-hour confidence as {@link energyHeatmap}.
 */
export function energyByHour(input: EnergyByHourInput): EnergyByHour {
  const o = resolveOptions(input);
  const days = new Set(input.days ?? [0, 1, 2, 3, 4, 5, 6]);
  for (const d of days) {
    if (!Number.isInteger(d) || d < 0 || d > 6) throw new RangeError('days must be weekdays 0–6');
  }
  const acc = accumulate(input, o, 24, (slot) => (days.has(slot.weekday) ? slot.hour : -1));
  const est = shrink(o.prior, acc, o.priorStrength);
  const cells: EnergyHourCell[] = [];
  for (let h = 0; h < 24; h++) cells.push(hourCell(o, acc, est, h, h));
  const best = argmax(est.values);
  return {
    ...summary(o, acc, est),
    cells,
    values: cells.map((c) => c.value),
    peak: best < 0 ? null : best,
  };
}

/**
 * 24 energy values (0..1, index = local hour) for the scheduler: the pooled hourly profile
 * of {@link energyByHour}. With no history it is the chronotype prior.
 */
export function energyProfile(input: EnergyByHourInput): number[] {
  return energyByHour(input).values;
}
