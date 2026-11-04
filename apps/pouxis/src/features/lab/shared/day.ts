import {
  addDays,
  isSameDay,
  startOfDay,
  type Interval,
  type Task,
  type TimeZone,
  type Timestamp,
} from '@pouxis/core';

export function dayRange(now: Timestamp, timeZone: TimeZone): Interval {
  const start = startOfDay(now, timeZone);
  return { start, end: addDays(start, 1, timeZone) };
}

export function isOpen(task: Task): boolean {
  return task.status === 'inbox' || task.status === 'todo' || task.status === 'doing';
}

/** Planned for the local day of `day`: floating on it or scheduled to start on it. */
export function isPlannedOn(task: Task, day: Timestamp, timeZone: TimeZone): boolean {
  const planned = task.scheduled?.start ?? task.floatingDay;
  return planned !== undefined && isSameDay(planned, day, timeZone);
}

export function completedOn(task: Task, day: Timestamp, timeZone: TimeZone): boolean {
  return (
    task.status === 'done' &&
    task.completedAt !== undefined &&
    isSameDay(task.completedAt, day, timeZone)
  );
}

/** Stable "most important first" order: important flag, priority, then oldest. */
export function byImportance(a: Task, b: Task): number {
  return (
    Number(b.important ?? false) - Number(a.important ?? false) ||
    b.priority - a.priority ||
    a.createdAt - b.createdAt ||
    (a.id < b.id ? -1 : 1)
  );
}
