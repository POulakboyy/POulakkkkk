/** Shared types of goal decomposition (2.2). */
import type { Energy, Locale, Minutes, Task, WorkMode } from '../../model.ts';

/** One proposed subtask, before it is saved as a task. */
export interface SubtaskDraft {
  title: string;
  estimateMin?: Minutes;
  mode: WorkMode;
  energy?: Energy;
  /**
   * Indices of earlier drafts in the same list that must be done first. Indices always point
   * backwards, so a draft list can never describe a dependency cycle.
   */
  dependsOn: number[];
}

export interface DecomposeContext {
  /** Language of the generated titles. */
  locale: Locale;
  /** Task the goal comes from; AI providers may use its notes, tags or project as context. */
  parent?: Task;
  /**
   * Spread the estimates so they add up to about this many minutes (each step rounded to
   * 5 min, at least 5). Leave unset to keep each step's typical duration.
   */
  budgetMin?: Minutes;
  /** Upper bound on the number of subtasks. Default 20. */
  maxSubtasks?: number;
}

/** A pluggable source of subtasks: the offline heuristic, or an AI provider. */
export interface Decomposer {
  /** Stable identifier, e.g. `heuristic` or the provider name. */
  readonly id: string;
  decompose(goal: string, ctx: DecomposeContext): Promise<SubtaskDraft[]>;
}

export const DEFAULT_MAX_SUBTASKS = 20;
