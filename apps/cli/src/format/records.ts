/** One-line and detailed renderings of tasks and events for the terminal. */
import type { CalendarEvent, Task } from '@pouxis/core';
import type { Messages } from '../i18n/index.ts';
import type { Palette } from '../output.ts';
import type { DateFormatter } from './dates.ts';
import { displayWidth, oneLine, truncate } from './text.ts';

export interface RenderContext {
  m: Messages;
  c: Palette;
  dates: DateFormatter;
  now: number;
  /** Short id per record id. */
  ids: ReadonlyMap<string, string>;
  /** Maximum line width (`Infinity` when piped). */
  width: number;
}

const STATUS_MARK: Record<Task['status'], string> = {
  inbox: '·',
  todo: '○',
  doing: '◐',
  done: '●',
  archived: '×',
};

export function priorityMark(priority: number): string {
  return priority > 0 ? '!'.repeat(priority) : '';
}

/** The instant a task is "about": its slot, its deadline, or its floating day. */
export function taskDate(task: Task): number | undefined {
  return task.scheduled?.start ?? task.deadline ?? task.floatingDay;
}

export function isOverdue(task: Task, now: number): boolean {
  return (
    task.deadline !== undefined &&
    task.deadline < now &&
    task.status !== 'done' &&
    task.status !== 'archived'
  );
}

export function taskLine(task: Task, r: RenderContext): string {
  const { c, m, dates } = r;
  const id = c.dim(r.ids.get(task.id) ?? task.id);
  const mark = task.status === 'done' ? c.green(STATUS_MARK.done) : STATUS_MARK[task.status];
  const meta: string[] = [];
  if (task.scheduled) meta.push(c.blue(dates.range(task.scheduled.start, task.scheduled.end)));
  else if (task.floatingDay !== undefined) meta.push(c.blue(dates.day(task.floatingDay)));
  if (task.deadline !== undefined) {
    const label = `${m.ls.duePrefix} ${dates.dayTime(task.deadline)}`;
    meta.push(isOverdue(task, r.now) ? c.red(`${label} · ${m.ls.overdueLabel}`) : label);
  }
  if (task.estimateMin !== undefined) meta.push(c.dim(dates.duration(task.estimateMin)));
  if (task.tags.length > 0) meta.push(c.cyan(task.tags.map((t) => `#${t}`).join(' ')));
  const prio = priorityMark(task.priority);
  const title = task.status === 'done' ? c.dim(oneLine(task.title)) : oneLine(task.title);
  return fit(`${id}  ${mark} ${prio ? `${c.yellow(prio)} ` : ''}`, title, meta, r.width);
}

export function eventLine(event: CalendarEvent, r: RenderContext): string {
  const { c, dates } = r;
  const id = c.dim(r.ids.get(event.id) ?? event.id);
  const meta: string[] = [];
  if (event.attendees.length > 0)
    meta.push(c.magenta(event.attendees.map((a) => `@${a}`).join(' ')));
  if (event.location) meta.push(c.dim(event.location));
  if (event.tags.length > 0) meta.push(c.cyan(event.tags.map((t) => `#${t}`).join(' ')));
  return fit(
    `${id}  ◆ ${c.blue(dates.range(event.start, event.end))} `,
    oneLine(event.title),
    meta,
    r.width,
  );
}

/** `head title  meta…`, truncating only the title when the line is too wide. */
function fit(head: string, title: string, meta: readonly string[], width: number): string {
  const tail = meta.length > 0 ? `  ${meta.join('  ')}` : '';
  if (!Number.isFinite(width)) return `${head}${title}${tail}`;
  const room = width - displayWidth(head) - displayWidth(tail);
  return `${head}${truncate(title, Math.max(8, room))}${tail}`;
}

/** Label/value rows describing a draft or a saved record (`pouxis add`, `edit`). */
export function detailRows(
  record: Task | CalendarEvent,
  r: Omit<RenderContext, 'ids' | 'width'>,
): [string, string][] {
  const { m, dates } = r;
  const L = m.labels;
  const rows: [string, string][] = [[L.title, record.title]];
  if ('status' in record) {
    if (record.scheduled)
      rows.push([L.scheduled, dates.range(record.scheduled.start, record.scheduled.end)]);
    if (record.floatingDay !== undefined) rows.push([L.day, dates.day(record.floatingDay)]);
    if (record.deadline !== undefined) rows.push([L.due, dates.dayTime(record.deadline)]);
    if (record.estimateMin !== undefined)
      rows.push([L.estimate, dates.duration(record.estimateMin)]);
    if (record.priority > 0)
      rows.push([L.priority, m.priorities[record.priority] ?? String(record.priority)]);
    rows.push([L.status, m.statuses[record.status]]);
  } else {
    rows.push([L.when, dates.range(record.start, record.end)]);
    if (record.attendees.length > 0)
      rows.push([L.with, record.attendees.map((a) => `@${a}`).join(', ')]);
    if (record.location) rows.push([L.where, record.location]);
  }
  if (record.recurrence) rows.push([L.recurrence, record.recurrence]);
  if (record.tags.length > 0) rows.push([L.tags, record.tags.map((t) => `#${t}`).join(' ')]);
  if (record.notes) rows.push([L.notes, oneLine(record.notes)]);
  return rows;
}

export function renderRows(rows: readonly [string, string][], c: Palette): string[] {
  const width = Math.max(...rows.map(([label]) => label.length));
  return rows.map(([label, value]) => `  ${c.dim(label.padEnd(width))}  ${value}`);
}
