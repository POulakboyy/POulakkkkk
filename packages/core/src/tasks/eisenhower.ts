/**
 * Computed Eisenhower matrix (2.4): tasks are placed on an urgency × importance grid from
 * their deadline, priority, explicit `important` flag and tags.
 */
import type { Minutes, Priority, Task, Timestamp } from '../model.ts';
import { HOUR, MINUTE } from '../time.ts';
import { foldTag, isOpen } from './common.ts';
import type { MoveResult, TaskPatch } from './common.ts';

/** do = urgent & important, schedule = important, delegate = urgent, eliminate = neither. */
export type Quadrant = 'do' | 'schedule' | 'delegate' | 'eliminate';

export const QUADRANTS: readonly Quadrant[] = ['do', 'schedule', 'delegate', 'eliminate'];

export interface EisenhowerOptions {
  /** A deadline closer than this (or past) makes a task urgent. Default 48 h. */
  urgentWithinMin?: Minutes;
  /** Lowest priority that counts as important. Default 2 (medium). */
  importantFromPriority?: Priority;
  /** Tags marking importance (matched case- and accent-insensitively, `#` ignored). */
  importantTags?: readonly string[];
  /** Tags marking urgency. The first one is added when a card is dragged into an urgent quadrant. */
  urgentTags?: readonly string[];
}

export const DEFAULT_URGENT_WITHIN_MIN: Minutes = (48 * HOUR) / MINUTE;

export const DEFAULT_IMPORTANT_TAGS: readonly string[] = [
  'important',
  'importante',
  'clé',
  'key',
  'must',
  'must-have',
  'essentiel',
  'essentielle',
  'essential',
  'critique',
  'critical',
  'vital',
  'prioritaire',
];

export const DEFAULT_URGENT_TAGS: readonly string[] = ['urgent', 'urgente', 'asap', 'urgence'];

function hasTag(task: Task, tags: readonly string[]): boolean {
  const wanted = new Set(tags.map(foldTag));
  return task.tags.some((tag) => wanted.has(foldTag(tag)));
}

/** Urgent when the deadline is within the window (or overdue), or an urgency tag is set. */
export function isUrgent(task: Task, now: Timestamp, opts: EisenhowerOptions = {}): boolean {
  return isDeadlineUrgent(task, now, opts) || hasTag(task, opts.urgentTags ?? DEFAULT_URGENT_TAGS);
}

function isDeadlineUrgent(task: Task, now: Timestamp, opts: EisenhowerOptions): boolean {
  if (task.deadline === undefined) return false;
  const window = (opts.urgentWithinMin ?? DEFAULT_URGENT_WITHIN_MIN) * MINUTE;
  return task.deadline - now <= window;
}

/**
 * Important when the explicit `important` flag says so; without a flag, inferred from
 * priority or an importance tag. An explicit `false` wins over the inference so that a card
 * dragged out of an important quadrant stays there.
 */
export function isImportant(task: Task, opts: EisenhowerOptions = {}): boolean {
  if (task.important !== undefined) return task.important;
  return (
    task.priority >= (opts.importantFromPriority ?? 2) ||
    hasTag(task, opts.importantTags ?? DEFAULT_IMPORTANT_TAGS)
  );
}

export function quadrant(task: Task, now: Timestamp, opts: EisenhowerOptions = {}): Quadrant {
  const urgent = isUrgent(task, now, opts);
  if (isImportant(task, opts)) return urgent ? 'do' : 'schedule';
  return urgent ? 'delegate' : 'eliminate';
}

/**
 * Open tasks sorted into the four quadrants. Inside a quadrant: earliest deadline first
 * (no deadline last), then highest priority, then input order.
 */
export function matrix(
  tasks: readonly Task[],
  now: Timestamp,
  opts: EisenhowerOptions = {},
): Record<Quadrant, Task[]> {
  const out: Record<Quadrant, Task[]> = { do: [], schedule: [], delegate: [], eliminate: [] };
  for (const task of tasks) if (isOpen(task)) out[quadrant(task, now, opts)].push(task);
  for (const q of QUADRANTS) out[q].sort(byUrgencyThenPriority);
  return out;
}

function byUrgencyThenPriority(a: Task, b: Task): number {
  const da = a.deadline ?? Number.POSITIVE_INFINITY;
  const db = b.deadline ?? Number.POSITIVE_INFINITY;
  if (da !== db) return da < db ? -1 : 1;
  return b.priority - a.priority;
}

/**
 * Patch that moves a task into `target` when the user drags it across the matrix.
 * Importance is pinned through the explicit `important` flag; urgency is added with an
 * urgency tag or removed by dropping urgency tags. A deadline inside the urgency window
 * cannot be undone by a drag: the move is refused with `deadline-too-close`.
 */
export function quadrantPatch(
  task: Task,
  target: Quadrant,
  now: Timestamp,
  opts: EisenhowerOptions = {},
): MoveResult {
  const patch: TaskPatch = {};
  const wantImportant = target === 'do' || target === 'schedule';
  const wantUrgent = target === 'do' || target === 'delegate';
  const urgentTags = opts.urgentTags ?? DEFAULT_URGENT_TAGS;

  if (isImportant(task, opts) !== wantImportant) patch.important = wantImportant;

  if (wantUrgent && !isUrgent(task, now, opts)) {
    patch.tags = [...task.tags, urgentTags[0] ?? 'urgent'];
  } else if (!wantUrgent && isUrgent(task, now, opts)) {
    if (isDeadlineUrgent(task, now, opts)) return { ok: false, reason: 'deadline-too-close' };
    const urgent = new Set(urgentTags.map(foldTag));
    patch.tags = task.tags.filter((tag) => !urgent.has(foldTag(tag)));
  }
  return { ok: true, patch };
}
