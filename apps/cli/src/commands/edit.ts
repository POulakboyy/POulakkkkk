import { MINUTE, atMinutes, endOfDay, startOfDay } from '@pouxis/core';
import type { CalendarEvent, Priority, Task, TaskStatus, WorkMode } from '@pouxis/core';
import type { Context } from '../context.ts';
import { CliError, UsageError } from '../errors.ts';
import { parseDuration, parseTimeOfDay } from '../format/dates.ts';
import { detailRows, renderRows } from '../format/records.ts';
import { resolveRef } from '../records.ts';
import { dateOption, formatterFor, rejectExtraArgs } from './shared.ts';
import type { Command } from './shared.ts';

const TASK_ONLY = ['due', 'day', 'priority', 'estimate', 'status', 'mode'] as const;
const EVENT_ONLY = ['start', 'end', 'location'] as const;
const COMMON = ['title', 'notes', 'tag', 'untag'] as const;

const PRIORITIES: Readonly<Record<string, Priority>> = {
  '0': 0, none: 0, aucune: 0, '1': 1, low: 1, basse: 1, '2': 2, medium: 2, moyenne: 2,
  '3': 3, high: 3, haute: 3,
}; // prettier-ignore
const STATUSES = new Set<TaskStatus>(['inbox', 'todo', 'doing', 'done', 'archived']);

export const edit: Command = {
  name: 'edit',
  aliases: ['e', 'set'],
  options: {
    title: { type: 'string' },
    notes: { type: 'string' },
    tag: { type: 'string', multiple: true },
    untag: { type: 'string', multiple: true },
    due: { type: 'string' },
    day: { type: 'string' },
    priority: { type: 'string', short: 'p' },
    estimate: { type: 'string' },
    status: { type: 'string' },
    mode: { type: 'string' },
    start: { type: 'string' },
    end: { type: 'string' },
    location: { type: 'string' },
  },
  async run(ctx) {
    const { m, out, args } = ctx;
    rejectExtraArgs(ctx, 'edit', 1);
    const prefix = args.positionals[0];
    if (prefix === undefined)
      throw new UsageError(m.errors.missingId, { hint: m.errors.idHint, command: 'edit' });
    if (![...COMMON, ...TASK_ONLY, ...EVENT_ONLY].some((name) => args.has(name))) {
      throw new UsageError(m.edit.nothing, { hint: m.errors.seeHelp('edit'), command: 'edit' });
    }

    const result = await ctx.store.transact((data) => {
      const ref = resolveRef(data, prefix, m, 'edit');
      const tz = data.prefs.timeZone;
      if (ref.kind === 'tasks') {
        rejectFlags(ctx, EVENT_ONLY, m.edit.notForTask);
        editTask(ctx, ref.record, tz);
      } else {
        rejectFlags(ctx, TASK_ONLY, m.edit.notForEvent);
        editEvent(ctx, ref.record, tz);
      }
      applyCommon(ctx, ref.record);
      ref.record.updatedAt = ctx.now;
      return { ref, prefs: data };
    });

    const { ref } = result;
    if (ctx.json) {
      out.json({ kind: ref.kind, record: ref.record });
      return;
    }
    out.line(
      `${out.c.green('✓')} ${out.c.bold(m.edit.updated)} ${out.c.dim(ref.record.id.slice(0, 8))}`,
    );
    const dates = formatterFor(ctx, result.prefs);
    const rows = detailRows(ref.record, { m, c: out.c, dates, now: ctx.now });
    for (const line of renderRows(rows, out.c)) out.line(line);
  },
};

function rejectFlags(
  ctx: Context,
  names: readonly string[],
  message: (flag: string) => string,
): void {
  const bad = names.find((n) => ctx.args.has(n));
  if (bad) throw new UsageError(message(`--${bad}`), { command: 'edit' });
}

function applyCommon(ctx: Context, record: Task | CalendarEvent): void {
  const { args } = ctx;
  const title = args.string('title');
  if (title !== undefined) {
    if (title.trim() === '') throw new UsageError(ctx.m.add.emptyTitle, { command: 'edit' });
    record.title = title.trim();
  }
  const notes = args.string('notes');
  if (notes !== undefined) {
    if (notes === '') delete record.notes;
    else record.notes = notes;
  }
  const strip = (t: string) => t.trim().replace(/^#+/, '');
  const removed = new Set(args.list('untag').map((t) => strip(t).toLowerCase()));
  const tags = record.tags.filter((t) => !removed.has(t.toLowerCase()));
  for (const tag of args.list('tag').map(strip)) {
    if (tag !== '' && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  }
  record.tags = tags;
}

function editTask(ctx: Context, task: Task, tz: string): void {
  const { args, m } = ctx;
  const due = args.string('due');
  if (due !== undefined) {
    const parsed = dateOption(ctx, due, tz, 'edit');
    if (parsed === 'clear') delete task.deadline;
    else task.deadline = parsed.hasTime ? parsed.ts : endOfDay(parsed.ts, tz) - MINUTE;
  }
  const day = args.string('day');
  if (day !== undefined) {
    const parsed = dateOption(ctx, day, tz, 'edit');
    if (parsed === 'clear') delete task.floatingDay;
    else {
      task.floatingDay = startOfDay(parsed.ts, tz);
      // A floating task has no fixed slot: release the previous one.
      delete task.scheduled;
      delete task.pinned;
    }
  }
  const priority = args.string('priority');
  if (priority !== undefined) {
    const p = PRIORITIES[priority.trim().toLowerCase()];
    if (p === undefined)
      throw new UsageError(m.errors.invalidPriority(priority), { command: 'edit' });
    task.priority = p;
  }
  const estimate = args.string('estimate');
  if (estimate !== undefined) {
    if (['none', 'aucune', '-'].includes(estimate.trim().toLowerCase())) delete task.estimateMin;
    else {
      const minutes = parseDuration(estimate);
      if (minutes === undefined)
        throw new UsageError(m.errors.invalidDuration(estimate), { command: 'edit' });
      task.estimateMin = minutes;
    }
  }
  const status = args.string('status');
  if (status !== undefined) {
    const s = status.trim().toLowerCase() as TaskStatus;
    if (!STATUSES.has(s)) throw new UsageError(m.errors.invalidStatus(status), { command: 'edit' });
    if (s === 'done' && task.status !== 'done') task.completedAt = ctx.now;
    if (s !== 'done' && s !== 'archived') delete task.completedAt;
    task.status = s;
  }
  const mode = args.string('mode');
  if (mode !== undefined) {
    const value = mode.trim().toLowerCase();
    if (value !== 'create' && value !== 'organize')
      throw new UsageError(m.errors.invalidMode(mode), { command: 'edit' });
    task.mode = value as WorkMode;
  }
}

function editEvent(ctx: Context, event: CalendarEvent, tz: string): void {
  const { args, m } = ctx;
  const length = event.end - event.start;
  const start = args.string('start');
  const end = args.string('end');
  const at = (value: string): number => {
    // A bare time ("16:00") stays on the event's own day.
    const minutes = parseTimeOfDay(value);
    if (minutes !== undefined) return atMinutes(startOfDay(event.start, tz), minutes, tz);
    const parsed = dateOption(ctx, value, tz, 'edit');
    if (parsed === 'clear')
      throw new UsageError(m.errors.invalidDate(value), {
        hint: m.errors.dateHint,
        command: 'edit',
      });
    return parsed.ts;
  };
  if (start !== undefined) {
    event.start = at(start);
    event.end = event.start + length;
  }
  if (end !== undefined) event.end = at(end);
  if (event.end <= event.start) throw new CliError(m.edit.endBeforeStart);
  const location = args.string('location');
  if (location !== undefined) {
    if (location.trim() === '' || location === '-') delete event.location;
    else event.location = location.trim();
  }
}
