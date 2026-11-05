/**
 * Express pre-mortem (X.10): imagine an important task has already failed, list why, and turn
 * each cause into a preventive subtask. Klein (2007) built the technique on "prospective
 * hindsight": explaining an outcome as if it had happened (Mitchell, Russo and Pennington,
 * 1989). Saved as one readable journal entry, one `cause → parade` per line.
 */
import {
  addDays,
  startOfDay,
  type Id,
  type JournalEntry,
  type Task,
  type TimeZone,
  type Timestamp,
} from '@pouxis/core';
import type { NewRecord } from '../../../store/index.ts';
import { byImportance, isOpen } from '../shared/day.ts';
import { labTag, taskTag, withTags } from '../shared/journal.ts';

export const PREMORTEM_TAG = labTag('premortem');
export const MAX_RISKS = 5;
export const MAX_CANDIDATES = 6;
/** Imagined failure date when the task has no deadline (product choice). */
export const HORIZON_DAYS = 30;
const SEPARATOR = ' → ';

export interface Risk {
  cause: string;
  parade: string;
}

const clean = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** Top-level open tasks worth a pre-mortem: the important ones first. */
export function premortemCandidates(tasks: readonly Task[]): Task[] {
  return tasks
    .filter((task) => isOpen(task) && task.parentId === undefined)
    .sort(byImportance)
    .slice(0, MAX_CANDIDATES);
}

/** The day the failure is imagined on: the deadline, or a month from today. */
export function failureDate(task: Task, now: Timestamp, timeZone: TimeZone): Timestamp {
  if (task.deadline !== undefined && task.deadline > now) return task.deadline;
  return addDays(startOfDay(now, timeZone), HORIZON_DAYS, timeZone);
}

/** Trimmed risks with a cause, capped at `MAX_RISKS`. */
export function cleanRisks(risks: readonly Risk[]): Risk[] {
  return risks
    .map((risk) => ({ cause: clean(risk.cause), parade: clean(risk.parade) }))
    .filter((risk) => risk.cause.length > 0)
    .slice(0, MAX_RISKS);
}

export function premortemText(risks: readonly Risk[]): string {
  return cleanRisks(risks)
    .map((risk) => (risk.parade ? `${risk.cause}${SEPARATOR}${risk.parade}` : risk.cause))
    .join('\n');
}

export function parsePremortem(text: string): Risk[] {
  return text
    .split('\n')
    .map((line) => {
      const at = line.indexOf(SEPARATOR);
      return at < 0
        ? { cause: line, parade: '' }
        : { cause: line.slice(0, at), parade: line.slice(at + SEPARATOR.length) };
    })
    .map((risk) => ({ cause: clean(risk.cause), parade: clean(risk.parade) }))
    .filter((risk) => risk.cause.length > 0);
}

/** One preventive subtask per risk that has a parade. */
export function paradeRecords(target: Task, risks: readonly Risk[]): NewRecord<'tasks'>[] {
  return cleanRisks(risks)
    .filter((risk) => risk.parade)
    .map((risk) => {
      const record: NewRecord<'tasks'> = {
        title: risk.parade,
        status: 'todo',
        priority: target.priority,
        tags: [],
        parentId: target.id,
        dependsOn: [],
        mode: target.mode,
        postponedCount: 0,
        timeLogs: [],
      };
      if (target.projectId !== undefined) record.projectId = target.projectId;
      return record;
    });
}

export function premortemTags(taskId: Id): string[] {
  return [PREMORTEM_TAG, taskTag(taskId)];
}

export function lastPremortem(
  journal: readonly JournalEntry[],
  taskId: Id,
): JournalEntry | undefined {
  return withTags(journal, PREMORTEM_TAG, taskTag(taskId))[0];
}
