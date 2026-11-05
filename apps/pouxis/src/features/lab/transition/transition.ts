/**
 * Transition airlock (X.12): before switching tasks, write where you are and the next step,
 * then take a short pause. A "ready-to-resume" plan reduces attention residue after an
 * interruption (Leroy and Glomb, 2018); the note is shown again when the task is picked next.
 *
 * Entry: `dump`, tags `lab:transition` + `lab:task:<id>`, text `where\nnext`.
 */
import type { Id, JournalEntry, Task, TimeZone, Timestamp } from '@pouxis/core';
import { byImportance, dayRange, isOpen, isPlannedOn } from '../shared/day.ts';
import { labTag, taskTag, withTags } from '../shared/journal.ts';

export const TRANSITION_TAG = labTag('transition');
/** Length of the optional settling pause (product choice). */
export const SETTLE_SECONDS = 60;
export const MAX_CANDIDATES = 6;

export interface ResumeNote {
  where: string;
  next: string;
}

const clean = (text: string): string => text.replace(/\s+/g, ' ').trim();

function workedOn(task: Task, now: Timestamp, timeZone: TimeZone): boolean {
  const { start } = dayRange(now, timeZone);
  return task.timeLogs.some((log) => log.kind === 'focus' && log.end > start);
}

/** Rank: in progress, then worked on today, then planned today, then importance. */
function rank(task: Task, now: Timestamp, timeZone: TimeZone): number {
  if (task.status === 'doing') return 0;
  if (workedOn(task, now, timeZone)) return 1;
  if (isPlannedOn(task, now, timeZone)) return 2;
  return 3;
}

function ranked(tasks: readonly Task[], now: Timestamp, timeZone: TimeZone): Task[] {
  return tasks
    .filter(isOpen)
    .map((task) => ({ task, rank: rank(task, now, timeZone) }))
    .sort((a, b) => a.rank - b.rank || byImportance(a.task, b.task))
    .map(({ task }) => task);
}

/** Tasks one is likely leaving: only those touched or planned today. */
export function leavingCandidates(
  tasks: readonly Task[],
  now: Timestamp,
  timeZone: TimeZone,
): Task[] {
  return ranked(tasks, now, timeZone)
    .filter((task) => rank(task, now, timeZone) < 3)
    .slice(0, MAX_CANDIDATES);
}

/** Where to go next: any open task but the one being left, today's first. */
export function nextCandidates(
  tasks: readonly Task[],
  leavingId: Id | null,
  now: Timestamp,
  timeZone: TimeZone,
): Task[] {
  return ranked(
    tasks.filter((task) => task.id !== leavingId),
    now,
    timeZone,
  ).slice(0, MAX_CANDIDATES);
}

export function transitionText(note: ResumeNote): string {
  return [clean(note.where), clean(note.next)].join('\n');
}

export function parseResume(text: string): ResumeNote {
  const [where = '', ...rest] = text.split('\n');
  return { where: clean(where), next: clean(rest.join(' ')) };
}

export function transitionTags(taskId: Id): string[] {
  return [TRANSITION_TAG, taskTag(taskId)];
}

/** Latest airlock note left on a task. */
export function resumeNoteFor(
  journal: readonly JournalEntry[],
  taskId: Id,
): JournalEntry | undefined {
  return withTags(journal, TRANSITION_TAG, taskTag(taskId))[0];
}

export interface StatusChange {
  id: Id;
  patch: Pick<Task, 'status'>;
  before: Pick<Task, 'status'>;
}

/** The task left goes back to "todo"; the next one becomes "doing". */
export function statusChanges(leaving: Task, next: Task | undefined): StatusChange[] {
  const changes: StatusChange[] = [];
  if (leaving.status === 'doing') {
    changes.push({ id: leaving.id, patch: { status: 'todo' }, before: { status: 'doing' } });
  }
  if (next && (next.status === 'todo' || next.status === 'inbox')) {
    changes.push({ id: next.id, patch: { status: 'doing' }, before: { status: next.status } });
  }
  return changes;
}

/** 0 → 1 progress of the settling pause started at `startedAt`. */
export function settleProgress(startedAt: Timestamp, now: Timestamp): number {
  return Math.min(Math.max((now - startedAt) / (SETTLE_SECONDS * 1000), 0), 1);
}
