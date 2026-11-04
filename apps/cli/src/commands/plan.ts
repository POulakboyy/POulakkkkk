import { endOfDay, startOfDay, scheduler, tasks as taskEngine } from '@pouxis/core';
import type { CalendarEvent, Id, Interval, Task, UserPrefs } from '@pouxis/core';
import type { Context } from '../context.ts';
import { UsageError } from '../errors.ts';
import { renderTimeline } from '../plan/timeline.ts';
import type { TimelineItem } from '../plan/timeline.ts';
import { dateFormatter } from '../format/dates.ts';
import { dateOption, rejectExtraArgs } from './shared.ts';
import type { Command } from './shared.ts';

type Placement = scheduler.Placement;
type Unplaced = scheduler.Unplaced;
type RouteWarning = scheduler.RouteWarning;

export interface DayPlan {
  day: number;
  range: Interval;
  events: CalendarEvent[];
  /** Tasks that already had a slot on this day. */
  scheduled: Task[];
  /** New slots: routed tasks, then floating tasks of the day. */
  proposals: Placement[];
  unplaced: Unplaced[];
  buffers: scheduler.EventDraft[];
  warnings: RouteWarning[];
}

/** Plans one local day: route open tasks, then magnetize the day's floating tasks. */
export function planDay(
  tasks: readonly Task[],
  events: readonly CalendarEvent[],
  prefs: UserPrefs,
  day: number,
  now: number,
): DayPlan {
  const tz = prefs.timeZone;
  const range = { start: startOfDay(day, tz), end: endOfDay(day, tz) };
  const open = tasks.filter(taskEngine.isOpen);
  const routed = scheduler.route({ tasks: open, events, prefs, range, now });
  const slots = new Map(routed.placements.map((p) => [p.taskId, p]));
  const withSlots = open.map((t) => {
    const p = slots.get(t.id);
    return p ? { ...t, scheduled: { start: p.start, end: p.end } } : t;
  });
  const magnet = scheduler.magnetize({ day: range.start, tasks: withSlots, events, prefs, now });
  const dayEvents = events
    .filter((e) => e.start < range.end && e.end > range.start)
    .sort((a, b) => a.start - b.start);
  const unplaced = new Map<Id, Unplaced>();
  for (const u of [...routed.unplaced, ...magnet.unplaced])
    if (!unplaced.has(u.taskId)) unplaced.set(u.taskId, u);
  return {
    day: range.start,
    range,
    events: dayEvents,
    scheduled: open.filter(
      (t) => t.scheduled && t.scheduled.start < range.end && t.scheduled.end > range.start,
    ),
    proposals: [...routed.placements, ...magnet.suggestions].sort((a, b) => a.start - b.start),
    unplaced: [...unplaced.values()],
    buffers: scheduler.insertBuffers(dayEvents, prefs),
    warnings: [...routed.warnings, ...magnet.warnings],
  };
}

const STEPS = new Set([15, 30, 60]);

export const plan: Command = {
  name: 'plan',
  aliases: ['p', 'day'],
  options: {
    date: { type: 'string', short: 'd' },
    save: { type: 'boolean' },
    step: { type: 'string' },
  },
  async run(ctx) {
    rejectExtraArgs(ctx, 'plan', 0);
    const { m } = ctx;
    const stepRaw = ctx.args.string('step') ?? '30';
    const step = Number(stepRaw);
    if (!STEPS.has(step)) throw new UsageError(m.errors.invalidStep(stepRaw), { command: 'plan' });

    const save = ctx.args.bool('save');
    let data = await ctx.store.load();
    const day = resolveDay(ctx, data.prefs.timeZone);
    let result = planDay(data.collections.tasks, data.collections.events, data.prefs, day, ctx.now);
    if (save && result.proposals.length > 0) {
      // Re-plan on the locked, latest data so the saved slots match what is on disk.
      data = await ctx.store.transact((d) => {
        result = planDay(d.collections.tasks, d.collections.events, d.prefs, day, ctx.now);
        const byId = new Map(d.collections.tasks.map((t) => [t.id, t]));
        for (const p of result.proposals) {
          const task = byId.get(p.taskId);
          if (!task) continue;
          task.scheduled = { start: p.start, end: p.end };
          task.updatedAt = ctx.now;
        }
        return d;
      });
    }

    const titles = new Map(data.collections.tasks.map((t) => [t.id, t.title]));
    if (ctx.json) {
      ctx.out.json(planJson(result, titles, data.prefs.timeZone, save));
      return;
    }
    printPlan(ctx, result, titles, data.prefs, step, save);
  },
};

function resolveDay(ctx: Context, tz: string): number {
  const raw = ctx.args.string('date');
  if (raw === undefined) return startOfDay(ctx.now, tz);
  const parsed = dateOption(ctx, raw, tz, 'plan');
  if (parsed === 'clear')
    throw new UsageError(ctx.m.errors.invalidDate(raw), {
      hint: ctx.m.errors.dateHint,
      command: 'plan',
    });
  return startOfDay(parsed.ts, tz);
}

function planJson(
  p: DayPlan,
  titles: ReadonlyMap<Id, string>,
  timeZone: string,
  saved: boolean,
): unknown {
  const iso = (ts: number) => new Date(ts).toISOString();
  return {
    day: iso(p.day),
    timeZone,
    saved,
    events: p.events.map((e) => ({
      id: e.id,
      title: e.title,
      start: iso(e.start),
      end: iso(e.end),
    })),
    scheduled: p.scheduled.map((t) => ({
      id: t.id,
      title: t.title,
      start: iso(t.scheduled!.start),
      end: iso(t.scheduled!.end),
    })),
    proposals: p.proposals.map((x) => ({
      taskId: x.taskId,
      title: titles.get(x.taskId) ?? '',
      start: iso(x.start),
      end: iso(x.end),
      reason: x.reason,
    })),
    unplaced: p.unplaced.map((u) => ({
      taskId: u.taskId,
      title: titles.get(u.taskId) ?? '',
      reason: u.reason,
    })),
    buffers: p.buffers.map((b) => ({ start: iso(b.start), end: iso(b.end) })),
    warnings: p.warnings,
  };
}

function printPlan(
  ctx: Context,
  p: DayPlan,
  titles: ReadonlyMap<Id, string>,
  prefs: UserPrefs,
  step: number,
  saved: boolean,
): void {
  const { out, m } = ctx;
  const { c } = out;
  const dates = dateFormatter(m, prefs.timeZone, ctx.now);
  out.line(c.bold(m.plan.title(dates.longDay(p.day), prefs.timeZone)));

  const items: TimelineItem[] = [
    ...p.events.map((e) => ({
      kind: 'event' as const,
      start: e.start,
      end: e.end,
      label: e.title,
    })),
    ...p.buffers.map((b) => ({
      kind: 'buffer' as const,
      start: b.start,
      end: b.end,
      label: m.plan.buffer,
    })),
    ...p.scheduled.map((t) => ({
      kind: 'task' as const,
      start: t.scheduled!.start,
      end: t.scheduled!.end,
      label: t.title,
    })),
    ...p.proposals.map((x) => ({
      kind: 'task' as const,
      start: x.start,
      end: x.end,
      label: titles.get(x.taskId) ?? x.taskId,
      proposed: !saved,
    })),
  ];
  if (items.length === 0 && p.unplaced.length === 0) {
    out.line(m.plan.nothing);
    return;
  }
  out.line();
  const lines = renderTimeline(items, {
    day: p.day,
    timeZone: prefs.timeZone,
    stepMin: step,
    workStart: prefs.workingHours.start,
    workEnd: prefs.workingHours.end,
    now: ctx.now,
    nowLabel: m.plan.now,
    c,
    width: out.width,
  });
  for (const line of lines) out.line(line);
  out.line();
  out.line(c.dim(m.plan.legend));

  if (p.unplaced.length > 0) {
    out.line();
    out.line(c.yellow(m.plan.unplaced(p.unplaced.length)));
    for (const u of p.unplaced)
      out.line(
        `  · ${titles.get(u.taskId) ?? u.taskId} ${c.dim(`— ${m.plan.reasons[u.reason] ?? u.reason}`)}`,
      );
  }
  for (const w of p.warnings) {
    const text =
      w.kind === 'deadline-missed'
        ? m.plan.warnings['deadline-missed'](titles.get(w.taskId) ?? w.taskId)
        : w.kind === 'overload'
          ? m.plan.warnings.overload(w.day)
          : w.kind === 'no-working-hours'
            ? m.plan.warnings['no-working-hours']
            : undefined;
    if (text) out.err(c.yellow(`! ${text}`));
  }
  out.line();
  if (saved) out.line(c.green(m.plan.saved(p.proposals.length)));
  else if (p.proposals.length > 0) out.line(c.dim(m.plan.saveHint));
}
