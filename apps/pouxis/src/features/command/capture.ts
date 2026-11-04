import { nlp } from '@pouxis/core';
import type { CalendarEvent, Locale, Task, TimeZone, WorkMode } from '@pouxis/core';
import type { NewRecord } from '../../store/index.ts';

export type CaptureKind = 'task' | 'event';

export interface CaptureContext {
  now: number;
  timeZone: TimeZone;
  locale: Locale;
  defaultMode: WorkMode;
}

export type CaptureDraft =
  | { collection: 'tasks'; data: NewRecord<'tasks'> }
  | { collection: 'events'; data: NewRecord<'events'> };

export interface CaptureItem {
  source: string;
  result: nlp.ParseResult;
  /** What will be created, after any user override. */
  kind: CaptureKind;
  /** `null` when nothing can be created (empty title). */
  draft: CaptureDraft | null;
}

const MEETING_WORDS =
  /\b(r[ée]union|rdv|rendez-vous|meeting|call|visio|appel|entretien|standup|stand-up|sync)\b/i;
const HOUR_MS = 3_600_000;

/** Removes `undefined` values: the domain model omits absent fields instead (model.ts). */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

/** An event needs a start; everything else can always become a task. */
export function canBeEvent(result: nlp.ParseResult): boolean {
  return result.start !== undefined;
}

export function toTask(r: nlp.ParseResult, defaultMode: WorkMode): NewRecord<'tasks'> {
  const timed = r.start !== undefined && !r.allDay;
  const scheduledEnd =
    r.end ?? (r.start !== undefined ? r.start + (r.estimateMin ?? 60) * 60_000 : undefined);
  const task: NewRecord<'tasks'> = {
    title: r.title,
    status: r.start !== undefined || r.deadline !== undefined ? 'todo' : 'inbox',
    priority: r.priority ?? 0,
    tags: [...r.tags],
    dependsOn: [],
    estimateMin: r.estimateMin ?? (timed ? r.durationMin : undefined),
    deadline: r.deadline,
    floatingDay: r.allDay ? r.start : undefined,
    scheduled:
      timed && r.start !== undefined && scheduledEnd !== undefined
        ? { start: r.start, end: scheduledEnd }
        : undefined,
    // A time typed by the user is a decision: the router must not move it.
    pinned: timed ? true : undefined,
    mode: r.mode ?? defaultMode,
    postponedCount: 0,
    recurrence: r.recurrence,
    timeLogs: [],
  } satisfies Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
  return compact(task);
}

export function toEvent(
  r: nlp.ParseResult,
  timeZone: TimeZone,
  source = r.title,
): NewRecord<'events'> | null {
  if (r.start === undefined) return null;
  const end = r.end ?? r.start + (r.allDay ? 24 * HOUR_MS : (r.durationMin ?? 60) * 60_000);
  const meeting = r.attendees.length > 0 || MEETING_WORDS.test(source);
  const event: NewRecord<'events'> = {
    title: r.title,
    start: r.start,
    end,
    timeZone,
    fixed: true,
    kind: meeting ? 'meeting' : 'personal',
    attendees: [...r.attendees],
    location: r.location,
    recurrence: r.recurrence,
    tags: [...r.tags],
  } satisfies Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>;
  return compact(event);
}

/** Parses one capture line and builds the record it will create. */
export function planCapture(
  source: string,
  ctx: CaptureContext,
  override?: CaptureKind,
): CaptureItem {
  const result = nlp.parse(source, { now: ctx.now, timeZone: ctx.timeZone, locale: ctx.locale });
  const wanted = override ?? result.kind;
  const kind: CaptureKind = wanted === 'event' && canBeEvent(result) ? 'event' : 'task';
  let draft: CaptureDraft | null = null;
  if (result.title.trim() !== '') {
    const event = kind === 'event' ? toEvent(result, ctx.timeZone, source) : null;
    draft = event
      ? { collection: 'events', data: event }
      : { collection: 'tasks', data: toTask(result, ctx.defaultMode) };
  }
  return { source, result, kind, draft };
}

/** One item per non-empty line: a multi-line capture is a brain dump. */
export function captureLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** Turns a dictation into one line per action (fillers removed by the engine). */
export function transcriptToText(transcript: string, locale: Locale): string {
  const items = nlp.splitActions(transcript, locale);
  return items.length > 0 ? items.join('\n') : nlp.cleanTranscript(transcript, locale);
}
