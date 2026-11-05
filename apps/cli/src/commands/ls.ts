import { endOfDay, startOfDay, tasks as taskEngine } from '@pouxis/core';
import type { CalendarEvent, Task, TaskStatus } from '@pouxis/core';
import type { Context } from '../context.ts';
import { UsageError } from '../errors.ts';
import { eventLine, isOverdue, taskDate, taskLine } from '../format/records.ts';
import type { DataFile } from '../store/schema.ts';
import { rejectExtraArgs, renderContext } from './shared.ts';
import type { Command } from './shared.ts';

const STATUSES: readonly TaskStatus[] = ['inbox', 'todo', 'doing', 'done', 'archived'];
const OPEN: readonly TaskStatus[] = ['inbox', 'todo', 'doing'];

export interface ListFilter {
  today: boolean;
  all: boolean;
  tags: string[];
  statuses?: TaskStatus[];
}

export const ls: Command = {
  name: 'ls',
  aliases: ['list', 'l'],
  options: {
    today: { type: 'boolean', short: 't' },
    tag: { type: 'string', multiple: true },
    status: { type: 'string', multiple: true },
    all: { type: 'boolean', short: 'a' },
    events: { type: 'boolean', short: 'e' },
  },
  async run(ctx) {
    rejectExtraArgs(ctx, 'ls', 0);
    const filter: ListFilter = {
      today: ctx.args.bool('today'),
      all: ctx.args.bool('all'),
      tags: ctx.args.list('tag'),
      statuses: parseStatuses(ctx),
    };
    const data = await ctx.store.load();
    const filtered = filter.tags.length > 0 || filter.statuses !== undefined || filter.today;
    if (ctx.args.bool('events')) {
      const events = filterEvents(data.collections.events, filter, data, ctx.now);
      if (ctx.json) return ctx.out.json(events);
      return print(
        ctx,
        data,
        events.map((e) => (r) => eventLine(e, r)),
        ctx.m.ls.countEvents(events.length),
        filtered,
      );
    }
    const tasks = filterTasks(data.collections.tasks, filter, data, ctx.now);
    if (ctx.json) return ctx.out.json(tasks);
    const overdue = tasks.filter((t) => isOverdue(t, ctx.now)).length;
    const summary = [
      ctx.m.ls.countTasks(tasks.length),
      ...(overdue > 0 ? [ctx.out.c.red(ctx.m.ls.overdue(overdue))] : []),
    ];
    print(
      ctx,
      data,
      tasks.map((t) => (r) => taskLine(t, r)),
      summary.join(' · '),
      filtered,
    );
  },
};

function print(
  ctx: Context,
  data: DataFile,
  rows: ((r: ReturnType<typeof renderContext>) => string)[],
  summary: string,
  filtered: boolean,
): void {
  const { out, m } = ctx;
  if (rows.length === 0) {
    out.line(filtered || data.collections.tasks.length > 0 ? m.ls.emptyFiltered : m.ls.empty);
    if (!filtered && data.collections.tasks.length === 0) out.line(out.c.dim(m.ls.emptyHint));
    return;
  }
  const r = renderContext(ctx, data);
  for (const row of rows) out.line(row(r));
  out.line(out.c.dim(summary));
}

function parseStatuses(ctx: Context): TaskStatus[] | undefined {
  const raw = ctx.args
    .list('status')
    .flatMap((s) => s.split(','))
    .map((s) => s.trim().toLowerCase());
  if (raw.length === 0) return undefined;
  for (const s of raw) {
    if (!STATUSES.includes(s as TaskStatus))
      throw new UsageError(ctx.m.errors.invalidStatus(s), { command: 'ls' });
  }
  return raw as TaskStatus[];
}

function hasTags(tags: readonly string[], wanted: readonly string[]): boolean {
  const folded = new Set(tags.map(taskEngine.foldTag));
  return wanted.every((w) => folded.has(taskEngine.foldTag(w)));
}

/** Tasks matching `filter`, sorted by date (undated last), then priority, then age. */
export function filterTasks(
  list: readonly Task[],
  filter: ListFilter,
  data: DataFile,
  now: number,
): Task[] {
  const tz = data.prefs.timeZone;
  const statuses = filter.statuses ?? (filter.all ? STATUSES : OPEN);
  const todayEnd = endOfDay(now, tz);
  const todayStart = startOfDay(now, tz);
  return list
    .filter((t) => statuses.includes(t.status))
    .filter((t) => hasTags(t.tags, filter.tags))
    .filter((t) => {
      if (!filter.today) return true;
      const when = taskDate(t);
      if (when === undefined) return t.status === 'doing';
      // Overdue items stay visible "today"; done ones only if completed today.
      if (t.status === 'done') return (t.completedAt ?? 0) >= todayStart;
      return when < todayEnd;
    })
    .sort(
      (a, b) =>
        (taskDate(a) ?? Infinity) - (taskDate(b) ?? Infinity) ||
        b.priority - a.priority ||
        a.createdAt - b.createdAt ||
        a.id.localeCompare(b.id),
    );
}

/** Upcoming events (all of them with `--all`), chronological. */
export function filterEvents(
  list: readonly CalendarEvent[],
  filter: ListFilter,
  data: DataFile,
  now: number,
): CalendarEvent[] {
  const tz = data.prefs.timeZone;
  const dayStart = startOfDay(now, tz);
  const dayEnd = endOfDay(now, tz);
  return list
    .filter((e) => hasTags(e.tags, filter.tags))
    .filter((e) =>
      filter.today ? e.start < dayEnd && e.end > dayStart : filter.all || e.end > now,
    )
    .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}
