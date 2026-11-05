/** Which task "Start focus" (shortcut, command bar) picks when none is named. */
import { endOfDay, startOfDay, tasks as taskEngine } from '@pouxis/core';
import type { Task, TimeZone, Timestamp } from '@pouxis/core';

/**
 * In order: the task whose slot is running now, the task already in progress, the next task
 * scheduled today, then the highest-priority floating task of today. Blocked tasks are skipped.
 */
export function pickFocusTask(
  all: readonly Task[],
  now: Timestamp,
  timeZone: TimeZone,
): Task | undefined {
  const dayStart = startOfDay(now, timeZone);
  const dayEnd = endOfDay(now, timeZone);
  const byId = new Map(all.map((t) => [t.id, t]));
  const ready = all.filter(
    (t) => taskEngine.isOpen(t) && t.dependsOn.every((d) => isDone(byId.get(d))),
  );
  const running = ready.find(
    (t) => t.scheduled && t.scheduled.start <= now && now < t.scheduled.end,
  );
  if (running) return running;
  const doing = ready.find((t) => t.status === 'doing');
  if (doing) return doing;
  const upcoming = ready
    .filter((t) => t.scheduled && t.scheduled.start >= now && t.scheduled.start < dayEnd)
    .sort((a, b) => (a.scheduled?.start ?? 0) - (b.scheduled?.start ?? 0))[0];
  if (upcoming) return upcoming;
  return ready
    .filter(
      (t) => t.floatingDay !== undefined && t.floatingDay >= dayStart && t.floatingDay < dayEnd,
    )
    .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt)[0];
}

function isDone(task: Task | undefined): boolean {
  // A missing dependency (deleted) does not block.
  return task === undefined || task.status === 'done' || task.status === 'archived';
}
