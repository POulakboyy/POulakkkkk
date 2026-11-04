import { createId } from '@pouxis/core';
import type { CalendarEvent, Task } from '@pouxis/core';
import { capture } from '../capture/index.ts';
import type { CaptureDraft } from '../capture/index.ts';
import { UsageError } from '../errors.ts';
import { detailRows, renderRows } from '../format/records.ts';
import { formatterFor } from './shared.ts';
import type { Command } from './shared.ts';

export const add: Command = {
  name: 'add',
  aliases: ['a', 'new'],
  options: { 'dry-run': { type: 'boolean' }, inbox: { type: 'boolean' } },
  async run(ctx) {
    const { m, out } = ctx;
    const text = ctx.args.positionals.join(' ').trim();
    if (text === '')
      throw new UsageError(m.add.emptyText, { hint: m.errors.seeHelp('add'), command: 'add' });

    const data = await ctx.store.load();
    const { timeZone, locale } = data.prefs;
    const draft = capture(text, { now: ctx.now, timeZone, locale });
    if (draft.title === '') throw new UsageError(m.add.emptyTitle, { command: 'add' });
    const record = toRecord(draft, {
      now: ctx.now,
      timeZone,
      inbox: ctx.args.bool('inbox'),
      withLabel: m.labels.with,
    });
    const dryRun = ctx.args.bool('dry-run');

    if (!dryRun) {
      await ctx.store.transact((d) => {
        if (record.kind === 'event') d.collections.events.push(record.event);
        else d.collections.tasks.push(record.task);
      });
    }

    const saved = record.kind === 'event' ? record.event : record.task;
    if (ctx.json) {
      out.json({ kind: record.kind, saved: !dryRun, record: saved });
      return;
    }
    const heading = dryRun
      ? m.add.preview
      : record.kind === 'event'
        ? m.add.savedEvent
        : m.add.savedTask;
    out.line(
      `${dryRun ? out.c.yellow('?') : out.c.green('✓')} ${out.c.bold(heading)} ${out.c.dim(saved.id.slice(0, 8))}`,
    );
    const dates = formatterFor(ctx, data);
    const rows = detailRows(saved, { m, c: out.c, dates, now: ctx.now });
    for (const line of renderRows(rows, out.c)) out.line(line);
  },
};

type NewRecord = { kind: 'task'; task: Task } | { kind: 'event'; event: CalendarEvent };

export interface RecordOptions {
  now: number;
  timeZone: string;
  /** File the task in the inbox instead of the to-do list. */
  inbox: boolean;
  /** Label of the "with @paul" line noted on a task. */
  withLabel: string;
}

export function toRecord(draft: CaptureDraft, o: RecordOptions): NewRecord {
  const stamp = { id: createId(), createdAt: o.now, updatedAt: o.now };
  if (draft.kind === 'event' && draft.start !== undefined && draft.end !== undefined) {
    const event: CalendarEvent = {
      ...stamp,
      title: draft.title,
      start: draft.start,
      end: draft.end,
      timeZone: o.timeZone,
      fixed: true,
      kind: draft.attendees.length > 0 ? 'meeting' : 'personal',
      attendees: draft.attendees,
      tags: draft.tags,
    };
    if (draft.location) event.location = draft.location;
    if (draft.recurrence) event.recurrence = draft.recurrence;
    return { kind: 'event', event };
  }
  const task: Task = {
    ...stamp,
    title: draft.title,
    status: o.inbox ? 'inbox' : 'todo',
    priority: draft.priority,
    tags: draft.tags,
    dependsOn: [],
    mode: draft.mode ?? 'organize',
    postponedCount: 0,
    timeLogs: [],
  };
  if (draft.recurrence) task.recurrence = draft.recurrence;
  if (draft.attendees.length > 0)
    task.notes = `${o.withLabel} ${draft.attendees.map((a) => `@${a}`).join(', ')}`;
  if (draft.deadline !== undefined) task.deadline = draft.deadline;
  if (draft.floatingDay !== undefined) task.floatingDay = draft.floatingDay;
  if (draft.estimateMin !== undefined) task.estimateMin = draft.estimateMin;
  if (draft.scheduled) {
    task.scheduled = draft.scheduled;
    task.pinned = true; // a time the user typed is a commitment the planner must not move
  }
  return { kind: 'task', task };
}
