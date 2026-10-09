/**
 * Floating tasks (1.10): tasks attached to a day without a time "snap" into the free gaps of
 * that day. Nothing existing moves; the result is a list of suggestions.
 *
 * Candidates are open tasks (`inbox`, `todo`, `doing`) whose `floatingDay` falls on the local
 * day, without a slot, not time-blocked by an event and with all dependencies done. The day's
 * working-hour span is used even on a day off: the user attached the task to it on purpose.
 */
import type { Interval } from '../model.ts';
import { dayKey } from '../time.ts';
import { alignUp, localDate, localDay, workingWindow } from './calendar.ts';
import {
  compareTasks,
  dependenciesDone,
  eventIntervals,
  focusIntervals,
  isOpen,
  linkedTaskIds,
  occupiedSlot,
  openParents,
} from './items.ts';
import { buildPlanDay, planTasks, readEnergyProfile, resolveSettings } from './planner.ts';
import type { MagnetizeInput, MagnetizeResult, RouteWarning, Unplaced } from './types.ts';

export function magnetize(input: MagnetizeInput): MagnetizeResult {
  const { tasks, events, prefs } = input;
  const timeZone = prefs.timeZone;
  const warnings: RouteWarning[] = [];
  const settings = resolveSettings(input.options, readEnergyProfile(input.energyProfile, warnings));
  const day = localDay(localDate(input.day, timeZone), timeZone);

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const linked = linkedTaskIds(events);
  const parents = openParents(tasks);
  const floating = tasks
    .filter(
      (t) =>
        isOpen(t) &&
        t.floatingDay !== undefined &&
        t.scheduled === undefined &&
        dayKey(t.floatingDay, timeZone) === day.key &&
        !linked.has(t.id) &&
        !parents.has(t.id),
    )
    .sort(compareTasks);
  const ready = floating.filter((t) => dependenciesDone(t, byId));
  const blocked: Unplaced[] = floating
    .filter((t) => !dependenciesDone(t, byId))
    .map((t) => ({ taskId: t.id, reason: 'blocked' }));

  const window = workingWindow(day, prefs.workingHours, timeZone, true);
  if (!window) {
    warnings.push({ kind: 'no-working-hours' });
    const unplaced = ready.map((t): Unplaced => ({ taskId: t.id, reason: 'no-slot' }));
    return { suggestions: [], unplaced: [...blocked, ...unplaced], warnings };
  }

  const slots = tasks.flatMap((t) => occupiedSlot(t) ?? []);
  const now = input.now ?? Number.NEGATIVE_INFINITY;
  const bounds: Interval = {
    start: Number.isFinite(now) ? Math.max(window.start, alignUp(now, settings.stepMs)) : window.start,
    end: window.end,
  };
  const plan = buildPlanDay({
    day,
    window,
    bounds,
    busy: [...eventIntervals(events), ...slots],
    focus: focusIntervals(events, slots, tasks, input.now ?? Number.POSITIVE_INFINITY),
    timeZone,
  });
  const outcome = planTasks(ready, plan ? [plan] : [], settings);
  const unplaced = plan
    ? outcome.unplaced
    : ready.map((t): Unplaced => ({ taskId: t.id, reason: 'no-slot' }));
  return {
    suggestions: outcome.placements,
    unplaced: [...blocked, ...unplaced],
    warnings: [...warnings, ...outcome.warnings],
  };
}
