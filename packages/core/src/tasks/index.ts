/**
 * Tasks engine: dependencies (2.1), decomposition (2.2), decay (2.3), Eisenhower matrix
 * (2.4), Pomodoro (2.6), formulas (2.8), kanban boards (2.12) and the WIP limit (2.15).
 * Every function is pure; changes are returned as `TaskPatch` objects for the store.
 */
export { clamp, foldTag, foldText, indexById, isCompleted, isOpen } from './common.ts';
export type { MoveRefusal, MoveResult, TaskLookup, TaskPatch } from './common.ts';

export {
  actionable,
  blockers,
  detectCycles,
  isActionable,
  topoOrder,
  unlockedBy,
  wouldCreateCycle,
} from './dependencies.ts';

export * from './decompose/index.ts';

export { AGING_LEVEL, decay, postponePatch } from './decay.ts';
export type { Decay, DecayOptions, DecayState } from './decay.ts';

export {
  DEFAULT_IMPORTANT_TAGS,
  DEFAULT_URGENT_TAGS,
  DEFAULT_URGENT_WITHIN_MIN,
  QUADRANTS,
  isImportant,
  isUrgent,
  matrix,
  quadrant,
  quadrantPatch,
} from './eisenhower.ts';
export type { EisenhowerOptions, Quadrant } from './eisenhower.ts';

export {
  DEFAULT_POMODORO,
  estimateAccuracy,
  focusMinutes,
  logTimePatch,
  pomodoroPlan,
} from './pomodoro.ts';
export type { EstimateAccuracy, PomodoroBlock, PomodoroOptions, PomodoroPlan } from './pomodoro.ts';

export * from './formula/index.ts';

export { NONE_KEY, hierarchyBoard, moveCardPatch, subtaskProgress, toBoard } from './kanban.ts';
export type {
  Board,
  BoardColumn,
  BoardGroupBy,
  BoardOptions,
  GroupBy,
  MoveOptions,
} from './kanban.ts';

export {
  WORKING_MEMORY_CITATION,
  canAddPriorityTask,
  isPlannedOn,
  wipReasonText,
  wipStatus,
} from './wip.ts';
export type { WipCheck, WipReason, WipStatus } from './wip.ts';
