/** Message keys for engine identifiers (groups, quadrants, board columns). */
import { tasks as engine, type Priority, type TaskStatus, type WorkMode } from '@pouxis/core';
import type { MessageKey } from '../../i18n/index.ts';
import type { FilterPill, ListGroupId, TaskViewMode } from './model.ts';

export type BoardGroup = Extract<engine.GroupBy, 'status' | 'priority' | 'mode' | 'tag'>;
export const BOARD_GROUPS: readonly BoardGroup[] = ['status', 'priority', 'mode', 'tag'];

export const VIEW_LABEL: Record<TaskViewMode, MessageKey> = {
  list: 'tasks.views.list',
  kanban: 'tasks.views.kanban',
  matrix: 'tasks.views.matrix',
  deps: 'tasks.views.deps',
};

export const GROUP_LABEL: Record<ListGroupId, MessageKey> = {
  inbox: 'tasks.groups.inbox',
  today: 'tasks.groups.today',
  toReschedule: 'tasks.groups.toReschedule',
  upcoming: 'tasks.groups.upcoming',
  noDate: 'tasks.groups.noDate',
  waiting: 'tasks.groups.waiting',
  done: 'tasks.groups.done',
};

export const PILL_LABEL: Record<FilterPill, MessageKey> = {
  today: 'tasks.filters.today',
  priority: 'tasks.filters.priority',
  create: 'tasks.filters.create',
  organize: 'tasks.filters.organize',
  blocked: 'tasks.filters.blocked',
  quick: 'tasks.filters.quick',
};

export const STATUS_LABEL: Record<TaskStatus, MessageKey> = {
  inbox: 'common.status.inbox',
  todo: 'common.status.todo',
  doing: 'common.status.doing',
  done: 'common.status.done',
  archived: 'common.status.archived',
};

export const PRIORITY_LABEL: Record<Priority, MessageKey> = {
  0: 'common.priority.none',
  1: 'common.priority.low',
  2: 'common.priority.medium',
  3: 'common.priority.high',
};

export const MODE_LABEL: Record<WorkMode, MessageKey> = {
  create: 'common.mode.create',
  organize: 'common.mode.organize',
};

/** The i18n file names the « eliminate » quadrant `drop` (« Mettre de côté »). */
export const QUADRANT_KEY: Record<engine.Quadrant, 'do' | 'schedule' | 'delegate' | 'drop'> = {
  do: 'do',
  schedule: 'schedule',
  delegate: 'delegate',
  eliminate: 'drop',
};

export const BOARD_GROUP_LABEL: Record<BoardGroup, MessageKey> = {
  status: 'tasks.kanban.groupByOptions.status',
  priority: 'tasks.kanban.groupByOptions.priority',
  mode: 'tasks.kanban.groupByOptions.mode',
  tag: 'tasks.kanban.groupByOptions.tag',
};

/** Label of a board column key for a given grouping; `null` means use the key verbatim. */
export function columnLabel(group: BoardGroup, key: string): MessageKey | null {
  switch (group) {
    case 'status':
      return STATUS_LABEL[key as TaskStatus] ?? null;
    case 'priority':
      return PRIORITY_LABEL[Number(key) as Priority] ?? null;
    case 'mode':
      return MODE_LABEL[key as WorkMode] ?? null;
    case 'tag':
      return key === engine.NONE_KEY ? 'tasks.kanban.noTag' : null;
  }
}
