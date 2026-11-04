/** Sentence → draft record, through the core natural-language parser (`nlp.parse`). */
import { MINUTE, nlp } from '@pouxis/core';
import type { Locale, TimeZone, Timestamp } from '@pouxis/core';
import type { CaptureDraft } from './types.ts';

export type { CaptureDraft } from './types.ts';

export interface CaptureContext {
  now: Timestamp;
  timeZone: TimeZone;
  locale: Locale;
}

/** Length of a task slot when the sentence names a time but no duration. */
export const DEFAULT_TASK_MIN = 30;

export function capture(text: string, ctx: CaptureContext): CaptureDraft {
  return toDraft(nlp.parse(text, ctx));
}

/** Maps a parse result onto the fields of a task or an event. */
export function toDraft(r: nlp.ParseResult): CaptureDraft {
  const draft: CaptureDraft = {
    kind: r.kind,
    title: r.title,
    tags: r.tags,
    priority: r.priority ?? 0,
    attendees: r.attendees,
  };
  if (r.recurrence) draft.recurrence = r.recurrence;
  if (r.kind === 'event' && r.start !== undefined) {
    draft.start = r.start;
    draft.end = r.end ?? r.start + (r.durationMin ?? 60) * MINUTE;
    if (r.location) draft.location = r.location;
    return draft;
  }
  draft.kind = 'task';
  if (r.mode) draft.mode = r.mode;
  if (r.deadline !== undefined) draft.deadline = r.deadline;
  if (r.estimateMin !== undefined) draft.estimateMin = r.estimateMin;
  if (r.start !== undefined) {
    if (r.allDay) draft.floatingDay = r.start;
    else {
      const minutes = r.estimateMin ?? r.durationMin ?? DEFAULT_TASK_MIN;
      draft.scheduled = { start: r.start, end: r.end ?? r.start + minutes * MINUTE };
    }
  }
  return draft;
}
