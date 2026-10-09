/**
 * Dynamic task routing (1.1): places actionable tasks into the free working time of a range.
 *
 * Rules, in order:
 * - candidates are `todo`/`doing` tasks that are not pinned, not floating (see `magnetize`),
 *   not time-blocked by an event, not a parent of open subtasks, without a slot (unless
 *   `replan`) and whose dependencies are all done (otherwise reported as `blocked`);
 * - candidates are processed earliest deadline first, then by priority, then by age;
 * - each one gets the earliest free slot inside working hours that respects the daily cap;
 *   with an energy profile, high-energy / creative tasks take the best-matching slot of that
 *   same day (low-energy tasks the lowest), never at the expense of their deadline;
 * - with `split`, a task that does not fit whole, or would miss its deadline whole, is spread
 *   over the earliest gaps in chunks of at least 25 min.
 */
import type { Interval, Task } from '../model.ts';
import { DAY, contains } from '../time.ts';
import {
  alignUp,
  hasWorkingHours,
  localDays,
  workingWindow,
  type LocalDay,
} from './calendar.ts';
import {
  compareTasks,
  dependenciesDone,
  eventIntervals,
  focusIntervals,
  isActionable,
  linkedTaskIds,
  occupiedSlot,
  openParents,
} from './items.ts';
import {
  buildPlanDay,
  overloadWarnings,
  planTasks,
  readEnergyProfile,
  resolveSettings,
  type PlanDay,
} from './planner.ts';
import type { RouteInput, RouteResult, RouteWarning, Unplaced } from './types.ts';

type Verdict = 'skip' | 'blocked' | 'candidate';

export function route(input: RouteInput): RouteResult {
  const { tasks, events, prefs, range, now } = input;
  const timeZone = prefs.timeZone;
  const warnings: RouteWarning[] = [];
  const settings = resolveSettings(input.options, readEnergyProfile(input.energyProfile, warnings));
  if (!hasWorkingHours(prefs.workingHours)) warnings.push({ kind: 'no-working-hours' });

  const bounds: Interval = {
    start: alignUp(Math.max(range.start, now), settings.stepMs),
    end: range.end,
  };
  const verdicts = classify(input);
  const candidates = tasks.filter((t) => verdicts.get(t.id) === 'candidate').sort(compareTasks);
  const blocked: Unplaced[] = tasks
    .filter((t) => verdicts.get(t.id) === 'blocked')
    .sort(compareTasks)
    .map((t) => ({ taskId: t.id, reason: 'blocked' }));

  const slots = tasks
    .filter((t) => verdicts.get(t.id) !== 'candidate')
    .flatMap((t) => occupiedSlot(t) ?? []);
  const busy = [...eventIntervals(events), ...slots];
  const focus = focusIntervals(events, slots, tasks, now);

  // Start one day early so an overnight shift that began yesterday is still usable.
  const days: PlanDay[] = [];
  for (const day of localDays({ start: bounds.start - DAY, end: bounds.end }, timeZone)) {
    const plan = planDayFor(day, input, bounds, busy, focus);
    if (plan) days.push(plan);
  }
  warnings.push(...overloadWarnings(days, settings));

  const outcome = planTasks(candidates, days, settings);
  return {
    placements: outcome.placements,
    unplaced: [...blocked, ...outcome.unplaced],
    warnings: [...warnings, ...outcome.warnings],
  };
}

function planDayFor(
  day: LocalDay,
  input: RouteInput,
  bounds: Interval,
  busy: readonly Interval[],
  focus: readonly Interval[],
): PlanDay | undefined {
  const { prefs } = input;
  const window = workingWindow(day, prefs.workingHours, prefs.timeZone);
  if (!window) return undefined;
  return buildPlanDay({ day, window, bounds, busy, focus, timeZone: prefs.timeZone });
}

function classify(input: RouteInput): Map<string, Verdict> {
  const { tasks, events, range, now } = input;
  const replan = input.options?.replan === true;
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const linked = linkedTaskIds(events);
  const parents = openParents(tasks);
  const verdicts = new Map<string, Verdict>();

  const routable = (t: Task) =>
    isActionable(t) &&
    t.pinned !== true &&
    t.floatingDay === undefined &&
    !linked.has(t.id) &&
    !parents.has(t.id);

  for (const t of tasks) {
    if (!routable(t)) {
      verdicts.set(t.id, 'skip');
      continue;
    }
    const ready = dependenciesDone(t, byId);
    if (t.scheduled) {
      // A slot already in progress or outside the range is never released.
      const releasable = replan && t.scheduled.start >= now && contains(range, t.scheduled);
      verdicts.set(t.id, ready && releasable ? 'candidate' : 'skip');
      continue;
    }
    verdicts.set(t.id, ready ? 'candidate' : 'blocked');
  }
  return verdicts;
}
