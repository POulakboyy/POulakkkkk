/**
 * Recurrence expansion (2.9): turns stored events into the concrete instances shown in a range.
 * A recurring event is the series template; its `start`/`end` anchor the series (DTSTART) and
 * give each occurrence its duration.
 */
import { recurrence, type CalendarEvent, type Interval, type Locale } from '@pouxis/core';

export interface EventInstance {
  /** Unique per occurrence: the event id, plus `@<start>` for a recurring occurrence. */
  key: string;
  event: CalendarEvent;
  start: number;
  end: number;
  recurring: boolean;
}

const ruleCache = new Map<string, recurrence.RecurrenceRule | null>();

/** Parsed rule of a recurrence text, memoised (rules are parsed for every visible range). */
export function ruleOf(text: string, locale: Locale): recurrence.RecurrenceRule | null {
  const cacheKey = `${locale}\u0000${text}`;
  if (!ruleCache.has(cacheKey)) ruleCache.set(cacheKey, recurrence.parseRule(text, { locale }));
  return ruleCache.get(cacheKey) ?? null;
}

/** Instance key of an occurrence, stable across renders. */
export function instanceKey(event: CalendarEvent, start: number, recurring: boolean): string {
  return recurring ? `${event.id}@${start}` : event.id;
}

/** Every instance overlapping `range`, sorted by start then key. */
export function expandEvents(
  events: readonly CalendarEvent[],
  range: Interval,
  locale: Locale,
): EventInstance[] {
  const out: EventInstance[] = [];
  for (const event of events) {
    if (!(event.end > event.start)) continue;
    const rule = event.recurrence ? ruleOf(event.recurrence, locale) : null;
    if (!rule) {
      if (event.start < range.end && event.end > range.start) out.push(single(event));
      continue;
    }
    const length = event.end - event.start;
    const starts = recurrence.occurrences(rule, {
      from: range.start - length + 1,
      to: range.end,
      timeZone: event.timeZone,
      dtstart: event.start,
      limit: 2_000,
    });
    for (const start of starts) {
      out.push({
        key: instanceKey(event, start, true),
        event,
        start,
        end: start + length,
        recurring: true,
      });
    }
  }
  return out.sort((a, b) => a.start - b.start || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

function single(event: CalendarEvent): EventInstance {
  return { key: event.id, event, start: event.start, end: event.end, recurring: false };
}

/** The instance as a plain event (engine functions take events): same id, occurrence times. */
export function asEvent(instance: EventInstance): CalendarEvent {
  return { ...instance.event, start: instance.start, end: instance.end };
}
