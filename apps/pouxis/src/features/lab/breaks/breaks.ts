/**
 * Well-timed breaks. Systematic breaks came with less fatigue and a better mood than
 * self-regulated ones in Biwer et al. (2023), who compared 24/6 and 12/3 rhythms; brief breaks
 * help sustain attention (Ariga and Lleras, 2011); walking favours divergent thinking (Oppezzo and
 * Schwartz, 2014). No duration is proven optimal, so the rhythm stays a user choice, with "free".
 */
import {
  MINUTE,
  startOfDay,
  type Id,
  type Minutes,
  type Task,
  type TimeLog,
  type TimeZone,
  type Timestamp,
  type WorkMode,
} from '@pouxis/core';

export type RhythmId = '24/6' | '12/3' | 'free';
export const RHYTHM_IDS: readonly RhythmId[] = ['24/6', '12/3', 'free'];
export type TimedRhythmId = Exclude<RhythmId, 'free'>;
export const DEFAULT_RHYTHM: TimedRhythmId = '24/6';

export interface Rhythm {
  focusMin: Minutes;
  restMin: Minutes;
}

export const RHYTHMS: Record<TimedRhythmId, Rhythm> = {
  '24/6': { focusMin: 24, restMin: 6 },
  '12/3': { focusMin: 12, restMin: 3 },
};

/** Past this much continuous focus, the suggestion becomes a real break (product heuristic). */
export const LONG_STRETCH_MIN = 90;
/** "Not now" hides the suggestion until this much more focus has accumulated. */
export const SNOOZE_MIN = 10;

export type BreakKind = 'micro' | 'move' | 'rest';

export interface FocusStretch {
  /** Continuous focus since the last break or pause, in ms. */
  focusMs: number;
  /** How long the user has been away from focus, when the gap already counts as a break. */
  restingMs?: number;
  /** Any focus logged today. */
  focusedToday: boolean;
  /** Mode and id of the task most recently focused on. */
  lastMode?: WorkMode;
  lastTaskId?: Id;
}

interface DayLog extends TimeLog {
  taskId: Id;
  mode: WorkMode;
}

function todaysLogs(tasks: readonly Task[], now: Timestamp, timeZone: TimeZone): DayLog[] {
  const from = startOfDay(now, timeZone);
  return tasks
    .flatMap((task) => task.timeLogs.map((log) => ({ ...log, taskId: task.id, mode: task.mode })))
    .filter((log) => log.end > from && log.start <= now)
    .sort((a, b) => a.start - b.start);
}

/**
 * Current focus stretch from today's time logs. A logged break, or a gap at least as long as a
 * rest (`restMin`), ends the stretch.
 */
export function focusStretch(
  tasks: readonly Task[],
  now: Timestamp,
  timeZone: TimeZone,
  restMin: Minutes,
): FocusStretch {
  const restMs = restMin * MINUTE;
  const from = startOfDay(now, timeZone);
  let focusMs = 0;
  let lastEnd: Timestamp | undefined;
  let focusedToday = false;
  let lastMode: WorkMode | undefined;
  let lastTaskId: Id | undefined;
  for (const log of todaysLogs(tasks, now, timeZone)) {
    const start = Math.max(log.start, from);
    const end = Math.min(log.end, now);
    if (log.kind === 'break') {
      focusMs = 0;
    } else {
      if (lastEnd !== undefined && start - lastEnd >= restMs) focusMs = 0;
      focusMs += Math.max(0, end - start);
      focusedToday = true;
      lastMode = log.mode;
      lastTaskId = log.taskId;
    }
    lastEnd = Math.max(lastEnd ?? end, end);
  }
  const stretch: FocusStretch = { focusMs, focusedToday, lastMode, lastTaskId };
  if (lastEnd !== undefined && now - lastEnd >= restMs) {
    return { ...stretch, focusMs: 0, restingMs: now - lastEnd };
  }
  return stretch;
}

export interface BreakSuggestion {
  kind: BreakKind;
  minutes: Minutes;
}

/** The break to suggest now, or `undefined` while the stretch is shorter than the rhythm. */
export function suggestBreak(stretch: FocusStretch, rhythm: RhythmId): BreakSuggestion | undefined {
  if (rhythm === 'free') return undefined;
  const { focusMin, restMin } = RHYTHMS[rhythm];
  if (stretch.focusMs < focusMin * MINUTE) return undefined;
  if (stretch.focusMs >= LONG_STRETCH_MIN * MINUTE) return { kind: 'rest', minutes: restMin * 2 };
  // Creative work: a short walk rather than a screen-side pause.
  if (stretch.lastMode === 'create') return { kind: 'move', minutes: Math.max(restMin, 5) };
  return { kind: 'micro', minutes: restMin };
}

/** Focus left before the next suggestion, in ms (0 when one is due; `undefined` when free). */
export function untilNextBreak(stretch: FocusStretch, rhythm: RhythmId): number | undefined {
  if (rhythm === 'free') return undefined;
  return Math.max(0, RHYTHMS[rhythm].focusMin * MINUTE - stretch.focusMs);
}

export function isSnoozed(stretch: FocusStretch, snoozedAtMs: number | undefined): boolean {
  return snoozedAtMs !== undefined && stretch.focusMs < snoozedAtMs + SNOOZE_MIN * MINUTE;
}

/** The break log to append to the last focused task, so the next stretch starts at zero. */
export function breakLog(start: Timestamp, end: Timestamp): TimeLog {
  return { start, end: Math.max(start, end), kind: 'break' };
}

export function isRhythmId(value: unknown): value is RhythmId {
  return typeof value === 'string' && (RHYTHM_IDS as readonly string[]).includes(value);
}
