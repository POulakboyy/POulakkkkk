/**
 * Shared state of the tasks view, provided once by `TasksView` so that rows, cards and the
 * detail sheet do not have to thread a dozen props.
 */
import { createContext, useContext } from 'react';
import type { Task, Timestamp, UserPrefs } from '@pouxis/core';
import type { BoundFormat } from '../../i18n/index.ts';
import type { RecordPatch } from '../../store/index.ts';
import type { Translate } from './actions.ts';

export interface TasksContextValue {
  t: Translate;
  fmt: BoundFormat;
  prefs: UserPrefs;
  /** Start of the current minute; re-rendered every minute. */
  now: Timestamp;
  all: readonly Task[];
  byId: ReadonlyMap<string, Task>;
  openTask: (id: string) => void;
  /**
   * Saves a patch, unless it would plan one priority too many on its day: the WIP dialog
   * (2.15) then asks how to proceed. `title` is the undo toast title; omit for silent saves.
   */
  save: (task: Task, patch: RecordPatch<'tasks'>, title?: string) => void;
  /** Polite screen-reader announcement (drag and drop, triage). */
  announce: (message: string) => void;
}

export const TasksContext = createContext<TasksContextValue | null>(null);

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used inside <TasksView>');
  return ctx;
}
