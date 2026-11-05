/**
 * Fresh start (X.14): stalled tasks get a clean restart on the next temporal landmark (start
 * of a week or a month), which people treat as a new "accounting period" for their goals
 * (Dai, Milkman and Riis, 2014). The restart resets the postponement counter that drives
 * decay (2.3); the previous count is kept on a journal entry so nothing is hidden.
 */
import {
  addDays,
  fromZoned,
  startOfWeek,
  tasks as taskOps,
  zonedParts,
  type Id,
  type Task,
  type TimeZone,
  type Timestamp,
  type UserPrefs,
} from '@pouxis/core';
import type { NewRecord } from '../../../store/index.ts';
import { byImportance } from '../shared/day.ts';
import { labTag, taskTag } from '../shared/journal.ts';

export const FRESH_TAG = labTag('freshstart');
export const MAX_STALLED = 5;
/** Product choice: a first step small enough to start without negotiating with oneself. */
export const FIRST_STEP_MIN = 10;

export type LandmarkKind = 'week' | 'month';

export interface Landmark {
  kind: LandmarkKind;
  /** Local midnight of the landmark day. */
  at: Timestamp;
}

/** The next start of a week (Monday) and of a month, soonest first; one if they coincide. */
export function nextLandmarks(now: Timestamp, timeZone: TimeZone): Landmark[] {
  const week = addDays(startOfWeek(now, timeZone), 7, timeZone);
  const { year, month } = zonedParts(now, timeZone);
  const monthStart = fromZoned({ year, month: month + 1, day: 1 }, timeZone);
  if (monthStart === week) return [{ kind: 'month', at: monthStart }];
  const list: Landmark[] = [
    { kind: 'week', at: week },
    { kind: 'month', at: monthStart },
  ];
  return list.sort((a, b) => a.at - b.at);
}

/** Open tasks that decay marks as aging or stale, most decayed first. */
export function stalledTasks(
  tasks: readonly Task[],
  prefs: Pick<UserPrefs, 'decayThreshold'>,
  now: Timestamp,
): Task[] {
  return tasks
    .map((task) => ({ task, decay: taskOps.decay(task, prefs, now) }))
    .filter(({ decay }) => decay.state !== 'fresh')
    .sort((a, b) => b.decay.level - a.decay.level || byImportance(a.task, b.task))
    .slice(0, MAX_STALLED)
    .map(({ task }) => task);
}

export interface TaskChange {
  id: Id;
  patch: taskOps.TaskPatch;
  before: taskOps.TaskPatch;
}

function snapshot(task: Task): taskOps.TaskPatch {
  return {
    status: task.status,
    floatingDay: task.floatingDay,
    scheduled: task.scheduled,
    pinned: task.pinned,
    postponedCount: task.postponedCount,
  };
}

/** Floats the task on the landmark day with a clean postponement counter. */
export function restartChange(task: Task, landmark: Landmark): TaskChange {
  return {
    id: task.id,
    patch: {
      floatingDay: landmark.at,
      scheduled: undefined,
      pinned: undefined,
      postponedCount: 0,
      status: task.status === 'inbox' ? 'todo' : task.status,
    },
    before: snapshot(task),
  };
}

/** Letting go is a legitimate outcome: the task is archived, not deleted. */
export function letGoChange(task: Task): TaskChange {
  return { id: task.id, patch: { status: 'archived' }, before: snapshot(task) };
}

/** A small first step, as a subtask floating on the same landmark day. */
export function firstStepRecord(
  parent: Task,
  title: string,
  landmark: Landmark,
): NewRecord<'tasks'> {
  const record: NewRecord<'tasks'> = {
    title: title.replace(/\s+/g, ' ').trim(),
    status: 'todo',
    priority: parent.priority,
    tags: [],
    parentId: parent.id,
    dependsOn: [],
    estimateMin: FIRST_STEP_MIN,
    floatingDay: landmark.at,
    mode: parent.mode,
    postponedCount: 0,
    timeLogs: [],
  };
  if (parent.projectId !== undefined) record.projectId = parent.projectId;
  return record;
}

/** Journal tags recording a restart and the postponement count it cleared. */
export function freshStartTags(task: Task, kind: LandmarkKind): string[] {
  return [
    FRESH_TAG,
    taskTag(task.id),
    labTag('landmark', kind),
    labTag('postponed', String(task.postponedCount)),
  ];
}
