/** Exposes a task to formulas: built-in task fields plus the user's custom `fields`. */
import type { Task } from '../../model.ts';
import { isImportant } from '../eisenhower.ts';
import { focusMinutes } from '../pomodoro.ts';
import type { FormulaScope, FormulaValue } from './types.ts';

/** Built-in names a task formula can read. They shadow custom fields of the same name. */
export const TASK_FORMULA_FIELDS = [
  'title',
  'status',
  'priority',
  'mode',
  'energy',
  'estimateMin',
  'postponedCount',
  'focusMin',
  'done',
  'important',
] as const;

export type TaskFormulaField = (typeof TASK_FORMULA_FIELDS)[number];

function isFormulaValue(value: unknown): value is FormulaValue {
  return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';
}

export function taskScope(task: Task): FormulaScope {
  // Null prototype: names such as `constructor` or `__proto__` stay plain data keys.
  const scope = Object.create(null) as Record<string, FormulaValue | undefined>;
  for (const [key, value] of Object.entries(task.fields ?? {})) {
    if (isFormulaValue(value)) scope[key] = value;
  }
  const builtins: Record<TaskFormulaField, FormulaValue | undefined> = {
    title: task.title,
    status: task.status,
    priority: task.priority,
    mode: task.mode,
    energy: task.energy,
    estimateMin: task.estimateMin,
    postponedCount: task.postponedCount,
    focusMin: focusMinutes(task),
    done: task.status === 'done',
    important: isImportant(task),
  };
  for (const name of TASK_FORMULA_FIELDS) scope[name] = builtins[name];
  return scope;
}
