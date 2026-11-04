/**
 * Helpers around subtask drafts: validation of untrusted provider output, budget scaling and
 * conversion into task records ready for `store.create('tasks', …)`.
 */
import type { Energy, Id, Minutes, Task, WorkMode } from '../../model.ts';
import { createId as defaultCreateId } from '../../id.ts';
import { DEFAULT_MAX_SUBTASKS } from './types.ts';
import type { SubtaskDraft } from './types.ts';

export const MAX_TITLE_LENGTH = 200;
/** A single subtask longer than a day should itself be decomposed. */
export const MAX_ESTIMATE_MIN: Minutes = 24 * 60;
const ROUND_TO_MIN = 5;

export interface SanitizeOptions {
  maxSubtasks?: number;
  /** Mode given to drafts that carry none (or an invalid one). Default `organize`. */
  fallbackMode?: WorkMode;
}

const MODES: ReadonlySet<string> = new Set<WorkMode>(['create', 'organize']);
const ENERGIES: ReadonlySet<string> = new Set<Energy>(['low', 'medium', 'high']);

/**
 * Turns arbitrary data (typically an AI provider's JSON) into valid drafts: titles are
 * trimmed, single-line and bounded; estimates become whole minutes within a day; unknown
 * modes fall back; dependencies keep only references to earlier, kept drafts (renumbered).
 * Items without a usable title are dropped. Never throws.
 */
export function sanitizeDrafts(raw: unknown, opts: SanitizeOptions = {}): SubtaskDraft[] {
  if (!Array.isArray(raw)) return [];
  const max = boundedCount(opts.maxSubtasks);
  const fallbackMode = opts.fallbackMode ?? 'organize';
  const newIndex = new Map<number, number>();
  const out: SubtaskDraft[] = [];

  raw.forEach((item: unknown, i) => {
    if (out.length >= max || !isObject(item)) return;
    const title = cleanTitle(item['title']);
    if (title === '') return;
    const draft: SubtaskDraft = {
      title,
      mode: oneOf(item['mode'], MODES) ? (item['mode'] as WorkMode) : fallbackMode,
      dependsOn: earlierDependencies(item['dependsOn'], i, newIndex),
    };
    const estimate = cleanEstimate(item['estimateMin']);
    if (estimate !== undefined) draft.estimateMin = estimate;
    if (oneOf(item['energy'], ENERGIES)) draft.energy = item['energy'] as Energy;
    newIndex.set(i, out.length);
    out.push(draft);
  });
  return out;
}

function isObject(value: unknown): value is { [key: string]: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf(value: unknown, allowed: ReadonlySet<string>): boolean {
  return typeof value === 'string' && allowed.has(value);
}

function boundedCount(max: number | undefined): number {
  if (max === undefined || !Number.isFinite(max)) return DEFAULT_MAX_SUBTASKS;
  return Math.max(0, Math.floor(max));
}

/** Collapses whitespace and control characters, then bounds the length. */
export function cleanTitle(value: unknown): string {
  if (typeof value !== 'string') return '';
  const flat = value.replace(/[\s\u0000-\u001f\u007f]+/g, ' ').trim();
  return [...flat].slice(0, MAX_TITLE_LENGTH).join('').trim();
}

function cleanEstimate(value: unknown): Minutes | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.min(MAX_ESTIMATE_MIN, Math.max(1, Math.round(value)));
}

function earlierDependencies(
  value: unknown,
  index: number,
  newIndex: ReadonlyMap<number, number>,
): number[] {
  if (!Array.isArray(value)) return [];
  const deps = new Set<number>();
  for (const ref of value) {
    if (typeof ref !== 'number' || !Number.isInteger(ref) || ref >= index) continue;
    const mapped = newIndex.get(ref);
    if (mapped !== undefined) deps.add(mapped);
  }
  return [...deps].sort((a, b) => a - b);
}

/**
 * Rescales the estimates so their sum approaches `budgetMin`, each rounded to 5 min and at
 * least 5 min. Drafts without an estimate are left as they are. Returns new objects.
 */
export function scaleToBudget(drafts: readonly SubtaskDraft[], budgetMin: Minutes): SubtaskDraft[] {
  const total = drafts.reduce((sum, d) => sum + (d.estimateMin ?? 0), 0);
  if (!(Number.isFinite(budgetMin) && budgetMin > 0) || total <= 0) {
    return drafts.map(copyDraft);
  }
  const factor = budgetMin / total;
  return drafts.map((draft) => {
    const copy = copyDraft(draft);
    if (draft.estimateMin !== undefined) {
      const scaled = Math.round((draft.estimateMin * factor) / ROUND_TO_MIN) * ROUND_TO_MIN;
      copy.estimateMin = Math.max(ROUND_TO_MIN, scaled);
    }
    return copy;
  });
}

function copyDraft(draft: SubtaskDraft): SubtaskDraft {
  return { ...draft, dependsOn: [...draft.dependsOn] };
}

/** A task ready for `store.create('tasks', record)`: the id is assigned up front. */
export type NewTaskRecord = Omit<Task, 'createdAt' | 'updatedAt'>;

export interface SubtaskRecordOptions {
  /** Goal task: becomes `parentId`; its project is inherited. */
  parent?: Task;
  /** Id factory, injectable for tests. Defaults to `createId`. */
  createId?: () => Id;
}

/**
 * Builds task records from drafts, translating draft indices in `dependsOn` into the new ids
 * (out-of-range or forward references are dropped). Subtasks start in `todo` with no
 * priority, so splitting a top-priority goal does not flood the WIP limit (2.15).
 */
export function subtaskRecords(
  drafts: readonly SubtaskDraft[],
  opts: SubtaskRecordOptions = {},
): NewTaskRecord[] {
  const nextId = opts.createId ?? defaultCreateId;
  const ids = drafts.map(() => nextId());
  return drafts.map((draft, i) => {
    const dependsOn = [...new Set(draft.dependsOn)]
      .filter((ref) => Number.isInteger(ref) && ref >= 0 && ref < i)
      .map((ref) => ids[ref] as Id);
    const record: NewTaskRecord = {
      id: ids[i] as Id,
      title: draft.title,
      status: 'todo',
      priority: 0,
      tags: [],
      dependsOn,
      mode: draft.mode,
      postponedCount: 0,
      timeLogs: [],
    };
    if (opts.parent) record.parentId = opts.parent.id;
    if (opts.parent?.projectId !== undefined) record.projectId = opts.parent.projectId;
    if (draft.estimateMin !== undefined) record.estimateMin = draft.estimateMin;
    if (draft.energy !== undefined) record.energy = draft.energy;
    return record;
  });
}
