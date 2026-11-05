/**
 * The event editor's form state and its conversion to and from stored events. Dates and times
 * use the `<input type="date|time">` formats (`2026-11-05`, `14:30`) in an explicit zone.
 */
import {
  fromZoned,
  zonedParts,
  type CalendarEvent,
  type EventKind,
  type Interval,
  type TimeZone,
  type Timestamp,
} from '@pouxis/core';
import type { EventInstance } from './expand.ts';

/** Kinds offered in the editor (buffers are only ever created by the buffer rule). */
export const EDITABLE_KINDS: readonly EventKind[] = ['meeting', 'focus', 'personal', 'travel'];

export interface EventForm {
  title: string;
  kind: EventKind;
  date: string;
  startTime: string;
  endTime: string;
  recurrence: string;
  location: string;
  notes: string;
  fixed: boolean;
  attendees: string[];
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateInput(ts: Timestamp, timeZone: TimeZone): string {
  const p = zonedParts(ts, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function toTimeInput(ts: Timestamp, timeZone: TimeZone): string {
  const p = zonedParts(ts, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Instant of a date and time input pair, or `null` when either is malformed. */
export function fromInputs(date: string, time: string, timeZone: TimeZone): Timestamp | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [year, month, day, hour, minute] = [d[1], d[2], d[3], t[1], t[2]].map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  return fromZoned({ year, month, day, hour, minute }, timeZone);
}

/**
 * Interval of the form. An end time at or before the start time (e.g. 23:00 → 00:30) is read
 * as the next day; equal times are invalid.
 */
export function formInterval(form: EventForm, timeZone: TimeZone): Interval | null {
  const start = fromInputs(form.date, form.startTime, timeZone);
  const sameDayEnd = fromInputs(form.date, form.endTime, timeZone);
  if (start === null || sameDayEnd === null || form.startTime === form.endTime) return null;
  if (sameDayEnd > start) return { start, end: sameDayEnd };
  const p = zonedParts(sameDayEnd, timeZone);
  const end = fromZoned(
    { year: p.year, month: p.month, day: p.day + 1, hour: p.hour, minute: p.minute },
    timeZone,
  );
  return { start, end };
}

export function formFromInterval(
  interval: Interval,
  timeZone: TimeZone,
  kind: EventKind = 'meeting',
): EventForm {
  return {
    title: '',
    kind,
    date: toDateInput(interval.start, timeZone),
    startTime: toTimeInput(interval.start, timeZone),
    endTime: toTimeInput(interval.end, timeZone),
    recurrence: '',
    location: '',
    notes: '',
    fixed: false,
    attendees: [],
  };
}

/** Form of an existing occurrence (its own times, so a series is edited where it was opened). */
export function formFromInstance(instance: EventInstance, timeZone: TimeZone): EventForm {
  const { event } = instance;
  return {
    ...formFromInterval(instance, timeZone, event.kind),
    title: event.title,
    recurrence: event.recurrence ?? '',
    location: event.location ?? '',
    notes: event.notes ?? '',
    fixed: event.fixed,
    attendees: [...event.attendees],
  };
}

/** Fields to store for a form whose occurrence now spans `interval`. */
export function eventFields(
  form: EventForm,
  interval: Interval,
  timeZone: TimeZone,
  source?: EventInstance,
): Pick<CalendarEvent, 'title' | 'kind' | 'start' | 'end' | 'fixed' | 'attendees' | 'timeZone'> &
  Partial<Pick<CalendarEvent, 'recurrence' | 'location' | 'notes'>> {
  const times = source ? retimeSeries(source, interval.start, interval.end) : interval;
  return {
    title: form.title.trim(),
    kind: form.kind,
    start: times.start,
    end: times.end,
    fixed: form.fixed,
    attendees: form.attendees,
    timeZone: source?.event.timeZone ?? timeZone,
    recurrence: form.recurrence.trim() || undefined,
    location: form.location.trim() || undefined,
    notes: form.notes.trim() || undefined,
  };
}

/**
 * New template times when one occurrence moves to `[start, end)`: a recurring series shifts by
 * the same amount (its DTSTART moves with it), a single event takes the times as they are.
 */
export function retimeSeries(instance: EventInstance, start: Timestamp, end: Timestamp): Interval {
  if (!instance.recurring) return { start, end };
  return {
    start: instance.event.start + (start - instance.start),
    end: instance.event.end + (end - instance.end),
  };
}
