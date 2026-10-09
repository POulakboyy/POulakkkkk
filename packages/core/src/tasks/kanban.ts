/**
 * Kanban generator (2.12): any task list becomes a board grouped by one field, and any
 * hierarchical list (tasks with `parentId`) becomes a board whose columns are the parents.
 * Card moves are expressed as task patches so the board stays a pure view of the data.
 */
import type { Id, Priority, Task, TaskStatus, Timestamp, WorkMode } from '../model.ts';
import { foldText, indexById } from './common.ts';
import type { MoveResult, TaskPatch } from './common.ts';
import { quadrant, quadrantPatch, QUADRANTS } from './eisenhower.ts';
import type { EisenhowerOptions, Quadrant } from './eisenhower.ts';

export type GroupBy = 'status' | 'priority' | 'mode' | 'tag' | 'project' | 'quadrant';
/** `parent` boards come from `hierarchyBoard`. */
export type BoardGroupBy = GroupBy | 'parent';

/** Key of the column gathering tasks without a value (no tag, no project, top level). */
export const NONE_KEY = '';

export interface BoardColumn {
  /**
   * Status, priority digit (`'3'`…`'0'`), mode, tag, project id, quadrant or parent id;
   * `NONE_KEY` for the "none" column.
   */
  key: string;
  tasks: Task[];
  /** Parent task the column stands for (hierarchy boards only). */
  parent?: Task;
}

export interface Board {
  groupBy: BoardGroupBy;
  columns: BoardColumn[];
}

export interface BoardOptions {
  /** Required to group by quadrant (urgency depends on the current time). */
  now?: Timestamp;
  /** Archived tasks are hidden unless set; grouping by status then adds an archived column. */
  includeArchived?: boolean;
  /** Preferred order of tag or project columns; listed keys show even when empty. */
  columnOrder?: readonly string[];
  eisenhower?: EisenhowerOptions;
}

const STATUSES: readonly TaskStatus[] = ['inbox', 'todo', 'doing', 'done'];
const PRIORITIES: readonly Priority[] = [3, 2, 1, 0];
const MODES: readonly WorkMode[] = ['create', 'organize'];

/**
 * Groups tasks into columns. Fixed domains (status, priority, mode, quadrant) always show
 * every column in a stable order; tag and project columns follow `columnOrder`, then tags
 * alphabetically / projects by first appearance, with the "none" column last. A task with
 * several tags appears in each of their columns. Cards keep the input order.
 * @throws RangeError when grouping by quadrant without `now`.
 */
export function toBoard(tasks: readonly Task[], groupBy: GroupBy, opts: BoardOptions = {}): Board {
  const visible = opts.includeArchived ? tasks : tasks.filter((t) => t.status !== 'archived');
  const keys = columnKeys(visible, groupBy, opts);
  const columns = new Map<string, Task[]>(keys.map((key) => [key, []]));
  for (const task of visible) {
    for (const key of keysOf(task, groupBy, opts)) columns.get(key)?.push(task);
  }
  return { groupBy, columns: keys.map((key) => ({ key, tasks: columns.get(key) ?? [] })) };
}

function columnKeys(tasks: readonly Task[], groupBy: GroupBy, opts: BoardOptions): string[] {
  switch (groupBy) {
    case 'status':
      return opts.includeArchived ? [...STATUSES, 'archived'] : [...STATUSES];
    case 'priority':
      return PRIORITIES.map(String);
    case 'mode':
      return [...MODES];
    case 'quadrant':
      requireNow(opts.now, 'group by quadrant');
      return [...QUADRANTS];
    case 'tag':
      return dynamicKeys(opts.columnOrder, sortTags(tasks.flatMap((t) => t.tags)));
    case 'project':
      return dynamicKeys(
        opts.columnOrder,
        tasks.flatMap((t) => (t.projectId ? [t.projectId] : [])),
      );
  }
}

function keysOf(task: Task, groupBy: GroupBy, opts: BoardOptions): string[] {
  switch (groupBy) {
    case 'status':
      return [task.status];
    case 'priority':
      return [String(task.priority)];
    case 'mode':
      return [task.mode];
    case 'quadrant':
      return [quadrant(task, requireNow(opts.now, 'group by quadrant'), opts.eisenhower)];
    case 'tag': {
      const tags = task.tags.filter((tag) => tag !== NONE_KEY);
      return tags.length > 0 ? [...new Set(tags)] : [NONE_KEY];
    }
    case 'project':
      return [task.projectId || NONE_KEY];
  }
}

function dynamicKeys(order: readonly string[] | undefined, found: readonly string[]): string[] {
  const keys = new Set<string>();
  for (const key of [...(order ?? []), ...found]) if (key !== NONE_KEY) keys.add(key);
  return [...keys, NONE_KEY];
}

function sortTags(tags: readonly string[]): string[] {
  return [...new Set(tags)].sort((a, b) => {
    const fa = foldText(a);
    const fb = foldText(b);
    if (fa !== fb) return fa < fb ? -1 : 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

function requireNow(now: Timestamp | undefined, action: string): Timestamp {
  if (now === undefined) throw new RangeError(`kanban: \`now\` is required to ${action}`);
  return now;
}

/**
 * Board of a hierarchical list: the children of `rootId` (top-level tasks when omitted)
 * become columns, their own children the cards. Archived tasks are skipped.
 */
export function hierarchyBoard(tasks: readonly Task[], rootId?: Id): Board {
  const live = tasks.filter((t) => t.status !== 'archived');
  const byId = indexById(live);
  const isColumn = (t: Task): boolean =>
    rootId === undefined ? t.parentId === undefined || !byId.has(t.parentId) : t.parentId === rootId;
  const columns: BoardColumn[] = live
    .filter((t) => t.id !== rootId && isColumn(t))
    .map((parent) => ({ key: parent.id, parent, tasks: [] }));
  const byKey = new Map(columns.map((c) => [c.key, c]));
  for (const task of live) {
    if (task.parentId !== undefined) byKey.get(task.parentId)?.tasks.push(task);
  }
  return { groupBy: 'parent', columns };
}

/** Done / total direct subtasks of `parentId` (archived subtasks are ignored). */
export function subtaskProgress(
  parentId: Id,
  tasks: readonly Task[],
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const task of tasks) {
    if (task.parentId !== parentId || task.status === 'archived') continue;
    total++;
    if (task.status === 'done') done++;
  }
  return { done, total };
}

export interface MoveOptions {
  /** Required when moving to `done` (stamps `completedAt`) or across quadrants. */
  now?: Timestamp;
  /** Tag boards: the column the card leaves, whose tag is replaced. */
  fromColumn?: string;
  /** Parent boards: all tasks, to refuse moving a task under its own descendant. */
  tasks?: readonly Task[];
  eisenhower?: EisenhowerOptions;
}

/**
 * Patch for dropping `task` into the column `toColumn` of a board grouped by `groupBy`.
 * Dropping into the column the task is already in yields an empty patch.
 * @throws RangeError when `now` is needed (done column, quadrants) but missing.
 */
export function moveCardPatch(
  task: Task,
  toColumn: string,
  groupBy: BoardGroupBy,
  opts: MoveOptions = {},
): MoveResult {
  switch (groupBy) {
    case 'status':
      return moveStatus(task, toColumn, opts);
    case 'priority': {
      const priority = PRIORITIES.find((p) => String(p) === toColumn);
      if (priority === undefined) return refuse('unknown-column');
      return ok(priority === task.priority ? {} : { priority });
    }
    case 'mode': {
      const mode = MODES.find((m) => m === toColumn);
      if (mode === undefined) return refuse('unknown-column');
      return ok(mode === task.mode ? {} : { mode });
    }
    case 'tag':
      return ok(moveTag(task, toColumn, opts.fromColumn));
    case 'project': {
      const projectId = toColumn === NONE_KEY ? undefined : toColumn;
      return ok(projectId === task.projectId ? {} : { projectId });
    }
    case 'quadrant': {
      const target = QUADRANTS.find((q): q is Quadrant => q === toColumn);
      if (target === undefined) return refuse('unknown-column');
      return quadrantPatch(task, target, requireNow(opts.now, 'move across quadrants'), opts.eisenhower);
    }
    case 'parent':
      return moveParent(task, toColumn, opts.tasks);
  }
}

function moveStatus(task: Task, toColumn: string, opts: MoveOptions): MoveResult {
  const status = [...STATUSES, 'archived' as const].find((s) => s === toColumn);
  if (status === undefined) return refuse('unknown-column');
  if (status === task.status) return ok({});
  const patch: TaskPatch = { status };
  if (status === 'done') patch.completedAt = requireNow(opts.now, 'move a card to done');
  else if (status !== 'archived' && task.completedAt !== undefined) patch.completedAt = undefined;
  return ok(patch);
}

function moveTag(task: Task, toColumn: string, fromColumn: string | undefined): TaskPatch {
  if (toColumn === NONE_KEY) return task.tags.length > 0 ? { tags: [] } : {};
  if (fromColumn === toColumn) return {};
  const kept = task.tags.filter((tag) => tag !== fromColumn && tag !== toColumn);
  const tags = [...kept, toColumn];
  const unchanged = tags.length === task.tags.length && tags.every((t) => task.tags.includes(t));
  return unchanged ? {} : { tags };
}

function moveParent(task: Task, toColumn: string, tasks: readonly Task[] | undefined): MoveResult {
  const parentId = toColumn === NONE_KEY ? undefined : toColumn;
  if (parentId === task.parentId) return ok({});
  if (parentId === task.id) return refuse('hierarchy-cycle');
  if (parentId !== undefined && tasks && isDescendant(parentId, task.id, tasks)) {
    return refuse('hierarchy-cycle');
  }
  return ok({ parentId });
}

/** Whether `id` sits somewhere below `ancestorId` in the parent chain. */
function isDescendant(id: Id, ancestorId: Id, tasks: readonly Task[]): boolean {
  const byId = indexById(tasks);
  const seen = new Set<Id>();
  let current = byId.get(id)?.parentId;
  while (current !== undefined && !seen.has(current)) {
    if (current === ancestorId) return true;
    seen.add(current);
    current = byId.get(current)?.parentId;
  }
  return false;
}

function ok(patch: TaskPatch): MoveResult {
  return { ok: true, patch };
}

function refuse(reason: 'unknown-column' | 'hierarchy-cycle'): MoveResult {
  return { ok: false, reason };
}
