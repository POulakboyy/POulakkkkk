import { nlp } from '@pouxis/core';
import type { CalendarEvent, Locale, Task, TimeZone, WorkMode } from '@pouxis/core';
import type { NewRecord, Store } from '../../store/index.ts';

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

export interface PlannedText {
  /** One item per non-empty line, in order. */
  items: CaptureItem[];
  /** Recognised tokens with offsets into the whole text (for highlighting). */
  tokens: nlp.ParseToken[];
}

/**
 * Plans a whole composer text: every non-empty line is one capture (brain dump). The kind
 * override only applies to a single-line capture, where the user can see what it changes.
 */
export function planText(text: string, ctx: CaptureContext, override?: CaptureKind): PlannedText {
  const items: CaptureItem[] = [];
  const tokens: nlp.ParseToken[] = [];
  const lines = text.split('\n');
  const single = lines.filter((l) => l.trim() !== '').length === 1;
  let offset = 0;
  for (const line of lines) {
    if (line.trim() !== '') {
      const item = planCapture(line, ctx, single ? override : undefined);
      items.push(item);
      for (const tok of item.result.tokens) {
        tokens.push({ ...tok, start: tok.start + offset, end: tok.end + offset });
      }
    }
    offset += line.length + 1;
  }
  return { items, tokens };
}

export interface Segment {
  text: string;
  type?: nlp.TokenType;
}

/** Splits `text` into plain and token segments, for the highlight layer behind the input. */
export function highlightSegments(text: string, tokens: readonly nlp.ParseToken[]): Segment[] {
  const sorted = [...tokens].sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let at = 0;
  for (const tok of sorted) {
    if (tok.start < at || tok.end > text.length || tok.end <= tok.start) continue;
    if (tok.start > at) out.push({ text: text.slice(at, tok.start) });
    out.push({ text: text.slice(tok.start, tok.end), type: tok.type });
    at = tok.end;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

export interface CreatedRecord {
  collection: 'tasks' | 'events';
  id: string;
  title: string;
}

/** Creates every plannable item as one undo step; items without a title are skipped. */
export function commitCapture(
  target: Pick<Store, 'create' | 'batch'>,
  items: readonly CaptureItem[],
  label?: string,
): CreatedRecord[] {
  const drafts = items.flatMap((i) => (i.draft ? [i.draft] : []));
  if (drafts.length === 0) return [];
  return target.batch(
    () =>
      drafts.map((d) => {
        const record =
          d.collection === 'events'
            ? target.create('events', d.data)
            : target.create('tasks', d.data);
        return { collection: d.collection, id: record.id, title: record.title };
      }),
    label,
  );
}
