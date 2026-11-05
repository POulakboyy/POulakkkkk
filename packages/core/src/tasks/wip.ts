/**
 * Cognitive-load limiter (2.15): caps the number of high-priority (priority 3) open tasks
 * planned on a single day. `UserPrefs.wipLimit` is the cap; 0 or less disables it.
 *
 * Rationale shown to the user: working memory holds only about four chunks at once
 * (Cowan, 2001), so a day with many "top priority" items stops having a priority at all.
 */
import type { Id, Locale, Task, TimeZone, Timestamp, UserPrefs } from '../model.ts';
import { endOfDay, startOfDay } from '../time.ts';
import { isOpen } from './common.ts';

export const WORKING_MEMORY_CITATION =
  'Cowan, N. (2001). The magical number 4 in short-term memory: A reconsideration of mental ' +
  'storage capacity. Behavioral and Brain Sciences, 24(1), 87–114.';

export interface WipStatus {
  /** High-priority open tasks planned that day. */
  count: number;
  limit: number;
  /** False when the limiter is disabled (`wipLimit` ≤ 0). */
  enabled: boolean;
  /** No more high-priority task can be added without exceeding the limit. */
  atLimit: boolean;
  /** More high-priority tasks than the limit are already planned. */
  exceeded: boolean;
  /** Ids of the counted tasks, in input order. */
  taskIds: Id[];
}

export interface WipReason {
  code: 'wip-limit-reached';
  count: number;
  limit: number;
  citation: string;
}

export interface WipCheck {
  allowed: boolean;
  status: WipStatus;
  /** Present when `allowed` is false. */
  reason?: WipReason;
}

/** Whether the task is planned on the day `[dayStart, dayEnd)`, by floating day or slot start. */
export function isPlannedOn(task: Task, dayStart: Timestamp, dayEnd: Timestamp): boolean {
  const at = (ts: Timestamp | undefined): boolean =>
    ts !== undefined && ts >= dayStart && ts < dayEnd;
  return at(task.floatingDay) || at(task.scheduled?.start);
}

/** Load of high-priority tasks on the day containing `day` in `timeZone`. */
export function wipStatus(
  tasks: readonly Task[],
  day: Timestamp,
  prefs: Pick<UserPrefs, 'wipLimit'>,
  timeZone: TimeZone,
): WipStatus {
  const start = startOfDay(day, timeZone);
  const end = endOfDay(day, timeZone);
  const taskIds = [
    ...new Set(
      tasks
        .filter((t) => t.priority === 3 && isOpen(t) && isPlannedOn(t, start, end))
        .map((t) => t.id),
    ),
  ];
  const count = taskIds.length;
  const limit = Number.isFinite(prefs.wipLimit) ? Math.floor(prefs.wipLimit) : 0;
  const enabled = limit > 0;
  return {
    count,
    limit,
    enabled,
    atLimit: enabled && count >= limit,
    exceeded: enabled && count > limit,
    taskIds,
  };
}

/**
 * Whether one more high-priority task may be planned on that day. Pass `candidateId` when
 * re-checking a task that may already be counted (editing it is then always allowed).
 */
export function canAddPriorityTask(
  tasks: readonly Task[],
  day: Timestamp,
  prefs: Pick<UserPrefs, 'wipLimit'>,
  timeZone: TimeZone,
  candidateId?: Id,
): WipCheck {
  const status = wipStatus(tasks, day, prefs, timeZone);
  const alreadyCounted = candidateId !== undefined && status.taskIds.includes(candidateId);
  if (!status.atLimit || alreadyCounted) return { allowed: true, status };
  return {
    allowed: false,
    status,
    reason: {
      code: 'wip-limit-reached',
      count: status.count,
      limit: status.limit,
      citation: WORKING_MEMORY_CITATION,
    },
  };
}

/** Short explanation of a refusal, ready to display. */
export function wipReasonText(reason: WipReason, locale: Locale): string {
  if (locale === 'fr') {
    return (
      `Déjà ${reason.count} tâches prioritaires prévues ce jour-là (limite : ${reason.limit}). ` +
      'La mémoire de travail ne retient qu’environ 4 éléments à la fois (Cowan, 2001) : ' +
      'mieux vaut en terminer ou en reporter une avant d’en ajouter une autre.'
    );
  }
  return (
    `${reason.count} high-priority tasks are already planned that day (limit: ${reason.limit}). ` +
    'Working memory holds only about 4 items at once (Cowan, 2001): finish or postpone one ' +
    'before adding another.'
  );
}
