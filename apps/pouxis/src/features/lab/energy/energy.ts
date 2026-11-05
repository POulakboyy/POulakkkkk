/**
 * Energy check-in. Self-reported energy refines the hourly curve that `insights.energyByHour`
 * shrinks toward (the chronotype prior of Horne and Östberg, 1976), so the curve reflects what
 * the user feels, not only what they tracked. Matching task demand to the current level follows
 * the time-of-day findings of Wieth and Zacks (2011), see docs/research/SCIENTIFIC_BASIS.md.
 */
import {
  HOUR,
  insights,
  zonedParts,
  type Energy,
  type JournalEntry,
  type Task,
  type TimeZone,
  type Timestamp,
} from '@pouxis/core';
import { byImportance, isOpen } from '../shared/day.ts';
import { dayTag, labTag, withTags } from '../shared/journal.ts';

export const ENERGY_TAG = labTag('energy');
export const ENERGY_LEVELS: readonly Energy[] = ['low', 'medium', 'high'];

/** Where each self-reported level sits on the 0..1 curve (product heuristic, not fitted). */
const LEVEL_VALUE: Record<Energy, number> = { low: 0.2, medium: 0.6, high: 1 };
/** Pseudo-count held by the base prior against check-ins, per hour. */
const PRIOR_WEIGHT = 1;
/** Check-ins older than this are ignored; younger ones decay with a two-week half-life. */
const WINDOW_WEEKS = 4;
const HALF_LIFE_WEEKS = 2;
const WEEK = 7 * 24 * HOUR;
/** A check-in also informs the neighbouring hours, at this weight, to keep the curve smooth. */
const NEIGHBOUR_WEIGHT = 0.5;

export function checkInTags(level: Energy, now: Timestamp, timeZone: TimeZone): string[] {
  return [ENERGY_TAG, labTag('energy', level), dayTag(now, timeZone)];
}

export function levelOf(entry: JournalEntry): Energy | undefined {
  return ENERGY_LEVELS.find((level) => entry.tags.includes(labTag('energy', level)));
}

export function checkIns(journal: readonly JournalEntry[]): JournalEntry[] {
  return withTags(journal, ENERGY_TAG).filter((entry) => levelOf(entry) !== undefined);
}

/** Most recent check-in, if it is from the last few hours (older ones no longer describe "now"). */
export function currentCheckIn(
  journal: readonly JournalEntry[],
  now: Timestamp,
  freshForMs = 3 * HOUR,
): JournalEntry | undefined {
  const latest = checkIns(journal)[0];
  return latest && now - latest.createdAt <= freshForMs ? latest : undefined;
}

/**
 * Blends `base` (24 hourly values) with the check-ins of the last four weeks: each hour becomes
 * the weighted mean of the prior and of the levels reported at (or next to) that hour.
 */
export function checkInPrior(
  journal: readonly JournalEntry[],
  base: readonly number[],
  now: Timestamp,
  timeZone: TimeZone,
): number[] {
  const sum = base.map((value) => value * PRIOR_WEIGHT);
  const weight = base.map(() => PRIOR_WEIGHT);
  for (const entry of checkIns(journal)) {
    const age = now - entry.createdAt;
    if (age < 0 || age > WINDOW_WEEKS * WEEK) continue;
    const level = levelOf(entry);
    if (!level) continue;
    const recency = 0.5 ** (age / WEEK / HALF_LIFE_WEEKS);
    const hour = zonedParts(entry.createdAt, timeZone).hour;
    for (const [offset, spread] of [
      [0, 1],
      [-1, NEIGHBOUR_WEIGHT],
      [1, NEIGHBOUR_WEIGHT],
    ] as const) {
      const h = (hour + offset + 24) % 24;
      const w = recency * spread;
      sum[h] = (sum[h] ?? 0) + LEVEL_VALUE[level] * w;
      weight[h] = (weight[h] ?? 0) + w;
    }
  }
  return sum.map((value, h) => value / (weight[h] ?? 1));
}

export interface EnergyCurveInput {
  tasks: readonly Task[];
  journal: readonly JournalEntry[];
  now: Timestamp;
  timeZone: TimeZone;
  chronotype?: insights.Chronotype | null;
}

/** Hourly energy curve: tracked focus history shrunk toward the check-in-adjusted prior. */
export function energyCurve(input: EnergyCurveInput): insights.EnergyByHour {
  const base = insights.circadianPrior(input.chronotype ?? 'intermediate');
  return insights.energyByHour({
    tasks: input.tasks,
    now: input.now,
    timeZone: input.timeZone,
    prior: checkInPrior(input.journal, base, input.now, input.timeZone),
  });
}

/** 24 values for `scheduler` (`energyProfile`), the same curve the check-in view shows. */
export function labEnergyProfile(input: EnergyCurveInput): number[] {
  return energyCurve(input).values;
}

/** How well a task suits the current energy; higher is better, negative means "not now". */
export function fitScore(task: Task, level: Energy): number {
  const short = task.estimateMin !== undefined && task.estimateMin <= 20;
  const long = task.estimateMin !== undefined && task.estimateMin >= 60;
  const demanding = task.energy === 'high' || (task.mode === 'create' && task.energy !== 'low');
  switch (level) {
    case 'high':
      return (demanding ? 2 : 0) + (long ? 1 : 0) - (task.energy === 'low' ? 2 : 0);
    case 'low':
      return (task.energy === 'low' ? 2 : 0) + (short ? 1 : 0) - (demanding ? 2 : 0) - (long ? 1 : 0);
    case 'medium':
      return (task.energy === 'medium' || task.energy === undefined ? 1 : 0) - (long ? 0.5 : 0);
  }
}

/** Open, actionable tasks that suit `level`, best fit first, then most important. */
export function tasksForEnergy(tasks: readonly Task[], level: Energy, limit = 3): Task[] {
  return tasks
    .filter((task) => isOpen(task) && !task.parentId)
    .map((task) => ({ task, score: fitScore(task, level) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || byImportance(a.task, b.task))
    .slice(0, limit)
    .map(({ task }) => task);
}

/** Check-ins in the curve's window, for the "n check-ins over 4 weeks" line. */
export function recentCheckInCount(journal: readonly JournalEntry[], now: Timestamp): number {
  return checkIns(journal).filter((e) => now - e.createdAt <= WINDOW_WEEKS * WEEK).length;
}
