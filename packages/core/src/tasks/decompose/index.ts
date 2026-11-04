/** Goal decomposition into subtasks (2.2): pluggable providers plus an offline heuristic. */
export type { DecomposeContext, Decomposer, SubtaskDraft } from './types.ts';
export { DEFAULT_MAX_SUBTASKS } from './types.ts';
export {
  choosePlan,
  decomposeOffline,
  heuristicDecomposer,
  stepsToDrafts,
  withFallback,
} from './heuristic.ts';
export type { Plan, PlanSource } from './heuristic.ts';
export {
  MAX_ESTIMATE_MIN,
  MAX_TITLE_LENGTH,
  cleanTitle,
  sanitizeDrafts,
  scaleToBudget,
  subtaskRecords,
} from './drafts.ts';
export type { NewTaskRecord, SanitizeOptions, SubtaskRecordOptions } from './drafts.ts';
export { GENERIC_STEPS, GOAL_TEMPLATES, VERB_CLASSES } from './templates.ts';
export type { GoalTemplate, Step, VerbClass } from './templates.ts';
