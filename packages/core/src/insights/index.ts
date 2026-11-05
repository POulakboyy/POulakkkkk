/**
 * Personal insights, computed locally from the user's own records: energy heatmap and profile
 * (1.3), creation/organisation balance (7.2), guilt-free streaks (7.3), skill tree (7.5),
 * weekly review (7.9), dead ends (5.15) and archive candidates (3.9).
 */
export {
  CHRONOTYPES,
  PRIOR_FLOOR,
  chronotypeFromMeq,
  circadianPrior,
  energyByHour,
  energyHeatmap,
  energyProfile,
  meqCategory,
} from './energy.ts';
export type {
  Chronotype,
  EnergyByHour,
  EnergyByHourInput,
  EnergyCell,
  EnergyHeatmap,
  EnergyHourCell,
  EnergyInput,
  MeqCategory,
} from './energy.ts';

export { balance } from './balance.ts';
export type { Balance, BalanceDay, BalanceInput, BalanceTotals } from './balance.ts';

export { activeDays, streak } from './streak.ts';
export type { ActiveDaysInput, Streak, StreakInput, StreakRules, StreakStatus } from './streak.ts';

export { weeklyReview } from './review.ts';
export type {
  Blocker,
  PlanningAccuracy,
  SlippedTask,
  Suggestion,
  WeeklyReview,
  WeeklyReviewInput,
  Win,
} from './review.ts';

export { archiveCandidates, deadEnds } from './lifecycle.ts';
export type { ArchiveOptions, DeadEndOptions, LifecycleRecord, StaleRecord } from './lifecycle.ts';

export { flattenSkills, skillTree } from './skills.ts';
export type { SkillNode, SkillTreeOptions } from './skills.ts';
