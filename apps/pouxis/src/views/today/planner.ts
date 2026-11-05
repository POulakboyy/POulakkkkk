/**
 * Glue between the Today view and the scheduling engine: which tasks "Plan my day" routes,
 * the energy profile it uses, suggested buffers, the maker-schedule guard and the overrun
 * preview. Pure functions — the view applies the results to the store.
 */
import {
  MINUTE,
  addDays,
  endOfDay,
  insights,
  overlaps,
  scheduler,
  startOfDay,
  tasks as taskEngine,
  type CalendarEvent,
  type Interval,
  type Task,
  type Timestamp,
  type UserPrefs,
} from '@pouxis/core';
import type {
  EnergyProfile,
  EventDraft,
  MagnetizeResult,
  MakerCheck,
  Placement,
  PropagateResult,
  RouteResult,
} from '@pouxis/core/scheduler';

/** Default length of a task without an estimate, as in the scheduler. */
export const DEFAULT_ESTIMATE_MIN = 30;

export interface DayContext {
  tasks: readonly Task[];
  events: readonly CalendarEvent[];
  prefs: UserPrefs;
  now: Timestamp;
  energy?: EnergyProfile;
}

/**
 * 24-hour energy profile (1.3) from the user's own focus history on working days, shrunk
 * toward the chronotype prior while data is scarce.
 */
export function energyFor(
  tasks: readonly Task[],
  now: Timestamp,
  prefs: UserPrefs,
  chronotype?: insights.Chronotype | null,
): number[] {
  const days = prefs.workingHours.days.length > 0 ? prefs.workingHours.days : undefined;
  return insights.energyProfile({
    tasks,
    now,
    timeZone: prefs.timeZone,
    ...(chronotype ? { chronotype } : {}),
    ...(days ? { days } : {}),
  });
}

/**
 * Whether "Plan my day" should place this unscheduled task today: attached to today (or an
 * earlier day), already in progress, or due by the end of tomorrow.
 */
export function wantsToday(task: Task, now: Timestamp, prefs: UserPrefs): boolean {
  if (task.scheduled !== undefined || !taskEngine.isOpen(task)) return false;
  const tz = prefs.timeZone;
  const tomorrowEnd = endOfDay(addDays(startOfDay(now, tz), 1, tz), tz);
  if (task.floatingDay !== undefined && task.floatingDay < endOfDay(now, tz)) return true;
  if (task.status === 'doing') return true;
  return task.deadline !== undefined && task.deadline < tomorrowEnd;
}

/**
 * Plans the day (1.1): routes the unscheduled tasks wanted today (in progress, due soon) by
 * energy fit, then magnetises today's floating tasks (1.10) into what is left. Scheduled
 * tasks and events stay where they are and count as busy.
 */
export function planDay(ctx: DayContext): RouteResult {
  const { tasks, events, prefs, now } = ctx;
  const routed = tasks.filter((t) => t.scheduled !== undefined || wantsToday(t, now, prefs));
  const result = scheduler.route({
    tasks: routed,
    events,
    prefs,
    now,
    range: { start: now, end: endOfDay(now, prefs.timeZone) },
    ...(ctx.energy ? { energyProfile: ctx.energy } : {}),
    options: { defaultEstimateMin: DEFAULT_ESTIMATE_MIN, split: false },
  });
  const placed = new Map(result.placements.map((p) => [p.taskId, p]));
  const today = startOfDay(now, prefs.timeZone);
  const withRouted = tasks.map((t) => {
    const p = placed.get(t.id);
    if (p) return { ...t, scheduled: { start: p.start, end: p.end } };
    // `route` skips floating tasks and `magnetize` only sees today's: carry overdue ones over.
    const overdue = t.floatingDay !== undefined && t.floatingDay < today;
    return overdue && wantsToday(t, now, prefs) ? { ...t, floatingDay: today } : t;
  });
  const magnet = magnetize({ ...ctx, tasks: withRouted });
  return {
    placements: [...result.placements, ...magnet.suggestions].sort((a, b) => a.start - b.start),
    unplaced: [...result.unplaced, ...magnet.unplaced],
    warnings: [...result.warnings, ...magnet.warnings],
  };
}

function magnetize(ctx: DayContext): MagnetizeResult {
  return scheduler.magnetize({
    day: ctx.now,
    tasks: ctx.tasks,
    events: ctx.events,
    prefs: ctx.prefs,
    now: ctx.now,
    ...(ctx.energy ? { energyProfile: ctx.energy } : {}),
    options: { defaultEstimateMin: DEFAULT_ESTIMATE_MIN, split: false },
  });
}

/** Suggested slots for today's floating tasks (1.10); nothing existing moves. */
export function magnetizeDay(ctx: DayContext): Placement[] {
  return magnetize(ctx).suggestions;
}

/** Slot for `task` at the start of `gap`, or undefined when its estimate does not fit. */
export function slotInGap(task: Task, gap: Interval): Interval | undefined {
  const length = (task.estimateMin ?? DEFAULT_ESTIMATE_MIN) * MINUTE;
  return gap.start + length <= gap.end ? { start: gap.start, end: gap.start + length } : undefined;
}

/** Transition buffers (1.6) between today's meetings that are not stored yet. */
export function missingBuffers(events: readonly CalendarEvent[], prefs: UserPrefs): EventDraft[] {
  const stored = events.filter((e) => e.kind === 'buffer');
  return scheduler
    .insertBuffers(events, prefs)
    .filter((draft) => !stored.some((b) => overlaps(b, draft)));
}

export interface MakerWarning {
  event: CalendarEvent;
  check: MakerCheck;
  /** Other starts that keep the deep-work block whole (same duration). */
  alternatives: Interval[];
}

/**
 * First upcoming meeting of the day that splits the longest deep-work block (1.15), with
 * alternative slots that would not.
 */
export function makerWarning(
  events: readonly CalendarEvent[],
  prefs: UserPrefs,
  now: Timestamp,
): MakerWarning | undefined {
  const timeZone = prefs.timeZone;
  const meetings = events
    .filter((e) => e.kind === 'meeting' && e.end > now)
    .sort((a, b) => a.start - b.start);
  for (const event of meetings) {
    const candidate = { id: event.id, start: event.start, end: event.end };
    const check = scheduler.checkMakerSchedule({ events, candidate, prefs, timeZone });
    if (check.code !== 'fragments-maker-block') continue;
    const alternatives = scheduler.suggestAlternatives({
      events,
      candidate,
      prefs,
      timeZone,
      now,
      limit: 1,
      searchDays: 1,
    });
    return { event, check, alternatives };
  }
  return undefined;
}

/**
 * Delay propagation preview (1.2): new slots of the overrunning item and of what follows it
 * today when it ends at `newEnd`. Fixed events never move.
 */
export function overrunPreview(
  tasks: readonly Task[],
  events: readonly CalendarEvent[],
  overrunId: string,
  newEnd: Timestamp,
  prefs: UserPrefs,
): PropagateResult {
  const tz = prefs.timeZone;
  const dayStart = startOfDay(newEnd, tz);
  const day = { start: dayStart, end: endOfDay(dayStart, tz) };
  const scheduled = tasks.filter(
    (t) => t.scheduled !== undefined && taskEngine.isOpen(t) && overlaps(t.scheduled, day),
  );
  const dayEvents = events.filter((e) => overlaps(e, day));
  return scheduler.propagateDelay({
    items: [...scheduled, ...dayEvents],
    overrunId,
    newEnd,
    prefs,
    timeZone: tz,
    mode: 'push',
  });
}

/** Start of tomorrow, the floating day overflowing tasks move to. */
export function tomorrowOf(now: Timestamp, prefs: UserPrefs): Timestamp {
  return addDays(startOfDay(now, prefs.timeZone), 1, prefs.timeZone);
}
