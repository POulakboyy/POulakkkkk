import type { Task } from '@pouxis/core';

export const TZ = 'Europe/Paris';
/** Thursday 5 November 2026, 10:00 in Paris. */
export const NOW = Date.UTC(2026, 10, 5, 9, 0);
export const DAY = 86_400_000;

let seq = 0;
export function task(patch: Partial<Task> = {}): Task {
  seq++;
  return {
    id: `t${seq}`,
    createdAt: NOW - seq * 1000,
    updatedAt: NOW,
    title: `Task ${seq}`,
    status: 'todo',
    priority: 0,
    tags: [],
    dependsOn: [],
    mode: 'organize',
    postponedCount: 0,
    timeLogs: [],
    ...patch,
  };
}
