import type { Task } from '../../model.ts';

export const T0 = Date.UTC(2026, 10, 4, 9, 0); // Wed 4 Nov 2026, 09:00 UTC

/** Builds a valid task; every field can be overridden. */
export function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    createdAt: T0,
    updatedAt: T0,
    title: `Task ${id}`,
    status: 'todo',
    priority: 0,
    tags: [],
    dependsOn: [],
    mode: 'organize',
    postponedCount: 0,
    timeLogs: [],
    ...overrides,
  };
}

export const ids = (tasks: readonly Task[]): string[] => tasks.map((t) => t.id);
