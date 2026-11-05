/**
 * Guilt-free streaks (feature 7.3).
 *
 * Rules, applied day by day from the first active day to `today` (local calendar days):
 * - an active day extends the current streak by one (`current` counts active days only);
 * - `today` is never a miss: the day is not over yet;
 * - a missed day is covered by a joker when one is left: the streak stays alive and the day
 *   is listed in `jokerDays` (status `protected` while no active day followed it). Missing a
 *   single opportunity did not measurably slow habit formation in Lally et al. (2010,
 *   European Journal of Social Psychology), so an occasional gap is treated as normal;
 * - jokers: `jokersPerWeek` are added at the start of each week (and on the first active
 *   day), never above `maxJokers`; with `earnJokerAfterRestDays = n`, a spent joker is
 *   recovered `n` days after it was used (recovery time), also capped by `maxJokers`;
 * - with no joker left the streak is `paused`, not lost: coming back within
 *   `resumeWithinDays` days of the first uncovered miss resumes the count where it stopped;
 *   after that the pause expires and the next active day starts a new streak.
 */
import type { Task, TimeZone, WorkMode } from '../model.ts';
import { MINUTE } from '../time.ts';
import {
  completedAt,
  createDayLookup,
  dayKeyOf,
  dayNumber,
  focusLogs,
  weekdayOf,
} from './internal.ts';

export interface StreakRules {
  /** Jokers granted at the start of each week. */
  jokersPerWeek: number;
  /** A spent joker comes back this many days after it was used. */
  earnJokerAfterRestDays?: number;
  /** Upper bound of the joker bank. */
  maxJokers: number;
  /** Days a paused streak waits for a comeback before it expires (default 7). */
  resumeWithinDays?: number;
  /** Week start for the weekly allowance, 0 = Sunday … 6 = Saturday (default 1 = Monday). */
  weekStartsOn?: number;
}

export interface StreakInput {
  /** Local days (`YYYY-MM-DD`) with qualifying activity; order and duplicates do not matter. */
  activeDays: readonly string[];
  /** Local day (`YYYY-MM-DD`) of "now". Active days after it are ignored. */
  today: string;
  rules: StreakRules;
}

export type StreakStatus = 'active' | 'protected' | 'paused';

export interface Streak {
  /** Active days in the current streak (0 when none is running or the pause expired). */
  current: number;
  /** Longest streak ever, in active days (includes the current one). */
  best: number;
  /** Jokers left in the bank after `today`. */
  jokersLeft: number;
  /** Days of the current streak covered by a joker, in order. */
  jokerDays: string[];
  status: StreakStatus;
  /** First uncovered missed day of a running pause, `null` otherwise. */
  pausedSince: string | null;
  /** Most recent active day, `null` when there is none. */
  lastActiveDay: string | null;
}

interface ResolvedRules {
  perWeek: number;
  recoverAfter: number | null;
  max: number;
  resumeWithin: number;
  weekStartsOn: number;
}

function nonNegativeInt(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0)
    throw new RangeError(`${name} must be an integer >= 0`);
  return value;
}

function resolveRules(rules: StreakRules): ResolvedRules {
  const recover = rules.earnJokerAfterRestDays;
  if (recover !== undefined && (!Number.isInteger(recover) || recover < 1)) {
    throw new RangeError('earnJokerAfterRestDays must be an integer >= 1');
  }
  const weekStartsOn = rules.weekStartsOn ?? 1;
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new RangeError('weekStartsOn must be a weekday 0–6');
  }
  return {
    perWeek: nonNegativeInt(rules.jokersPerWeek, 'jokersPerWeek'),
    recoverAfter: recover ?? null,
    max: nonNegativeInt(rules.maxJokers, 'maxJokers'),
    resumeWithin: nonNegativeInt(rules.resumeWithinDays ?? 7, 'resumeWithinDays'),
    weekStartsOn,
  };
}

function parseDay(key: string, name: string): number {
  const n = dayNumber(key);
  if (n === null) throw new RangeError(`${name} must be a valid YYYY-MM-DD day: ${key}`);
  return n;
}

/** Current and best streak, joker bank and status for a set of active days. */
export function streak(input: StreakInput): Streak {
  const r = resolveRules(input.rules);
  const today = parseDay(input.today, 'today');
  const active = new Set<number>();
  for (const key of input.activeDays) {
    const n = parseDay(key, 'activeDays');
    if (n <= today) active.add(n);
  }
  if (active.size === 0) {
    return {
      current: 0,
      best: 0,
      jokersLeft: Math.min(r.max, r.perWeek),
      jokerDays: [],
      status: 'paused',
      pausedSince: null,
      lastActiveDay: null,
    };
  }
  const first = Math.min(...active);

  let bank = Math.min(r.max, r.perWeek);
  const recoveries = new Map<number, number>();
  let current = 0;
  let best = 0;
  let jokerDays: number[] = [];
  let pausedSince: number | null = null;
  let lastActive = first;

  for (let d = first; d <= today; d++) {
    if (d > first && weekdayOf(d) === r.weekStartsOn) bank = Math.min(r.max, bank + r.perWeek);
    const recovered = recoveries.get(d);
    if (recovered !== undefined) {
      bank = Math.min(r.max, bank + recovered);
      recoveries.delete(d);
    }

    if (pausedSince !== null && d - pausedSince >= r.resumeWithin) {
      // The pause expired: whatever comes next is a new streak.
      current = 0;
      jokerDays = [];
      pausedSince = null;
    }

    if (active.has(d)) {
      pausedSince = null;
      current++;
      best = Math.max(best, current);
      lastActive = d;
    } else if (d < today && current > 0 && pausedSince === null) {
      if (bank > 0) {
        bank--;
        jokerDays.push(d);
        if (r.recoverAfter !== null) {
          const at = d + r.recoverAfter;
          recoveries.set(at, (recoveries.get(at) ?? 0) + 1);
        }
      } else {
        pausedSince = d;
      }
    }
  }

  const lastJoker = jokerDays[jokerDays.length - 1];
  let status: StreakStatus;
  if (current === 0 || pausedSince !== null) status = 'paused';
  else if (lastJoker !== undefined && lastJoker > lastActive) status = 'protected';
  else status = 'active';

  return {
    current,
    best,
    jokersLeft: bank,
    jokerDays: jokerDays.map(dayKeyOf),
    status,
    pausedSince: pausedSince === null ? null : dayKeyOf(pausedSince),
    lastActiveDay: dayKeyOf(lastActive),
  };
}

export interface ActiveDaysInput {
  tasks: readonly Task[];
  timeZone: TimeZone;
  /** Only work of this mode counts (default `'create'`: the streak tracks creative days). */
  mode?: WorkMode | 'any';
  /** Focus minutes needed on a day for it to count without a completion (default 1). */
  minFocusMin?: number;
}

/**
 * Local days (`YYYY-MM-DD`, ascending) with qualifying work: a task of `mode` completed that
 * day, or at least `minFocusMin` focus minutes logged on such tasks (split at local midnight).
 */
export function activeDays(input: ActiveDaysInput): string[] {
  const mode = input.mode ?? 'create';
  const minMs = (input.minFocusMin ?? 1) * MINUTE;
  if (!(minMs >= 0)) throw new RangeError('minFocusMin must be >= 0');
  const localDay = createDayLookup(input.timeZone);
  const focus = new Map<string, number>();
  const days = new Set<string>();
  for (const task of input.tasks) {
    if (mode !== 'any' && task.mode !== mode) continue;
    const done = completedAt(task);
    if (done !== undefined && Number.isFinite(done)) days.add(localDay(done).key);
    for (const log of focusLogs(task)) {
      let t = log.start;
      while (t < log.end) {
        const day = localDay(t);
        const next = Math.min(log.end, day.end);
        focus.set(day.key, (focus.get(day.key) ?? 0) + (next - t));
        t = next;
      }
    }
  }
  for (const [key, ms] of focus) if (ms >= minMs && ms > 0) days.add(key);
  return [...days].sort();
}
