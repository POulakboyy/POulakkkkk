/**
 * Transition buffers (1.6): a short break after a meeting that is immediately followed by
 * another one, so the day keeps room to breathe between back-to-back meetings.
 *
 * - The buffer length is `prefs.bufferMin`, clamped to 5–15 min.
 * - A buffer starts when the meeting ends. It is shortened so it never overlaps a fixed
 *   event, and dropped when less than 5 min would remain.
 * - It may overlap a non-fixed event: the caller then makes room, e.g. with `propagateDelay`.
 * - Meetings already followed by a buffer event are skipped, so the function is idempotent.
 */
import type { CalendarEvent, Interval, Locale, UserPrefs } from '../model.ts';
import { MINUTE, overlaps } from '../time.ts';
import { compareIds, isValidInterval } from './calendar.ts';
import type { BufferOptions, EventDraft } from './types.ts';

const MIN_BUFFER = 5 * MINUTE;
const MAX_BUFFER = 15 * MINUTE;
const TITLES = { fr: 'Transition', en: 'Buffer' } as const;

export function bufferLengthMs(bufferMin: number): number {
  const ms = Number.isFinite(bufferMin) ? bufferMin * MINUTE : MIN_BUFFER;
  return Math.min(MAX_BUFFER, Math.max(MIN_BUFFER, ms));
}

export function insertBuffers(
  events: readonly CalendarEvent[],
  prefs: Pick<UserPrefs, 'bufferMin' | 'locale'>,
  options: BufferOptions = {},
): EventDraft[] {
  const kinds = new Set(options.kinds ?? ['meeting']);
  const len = bufferLengthMs(prefs.bufferMin);
  const valid = events.filter(isValidInterval);
  const meetings = valid
    .filter((e) => kinds.has(e.kind))
    .sort((a, b) => a.start - b.start || compareIds(a.id, b.id));
  const fixed = valid.filter((e) => e.fixed);
  const buffers = valid.filter((e) => e.kind === 'buffer');

  const drafts: EventDraft[] = [];
  for (const meeting of meetings) {
    const wanted: Interval = { start: meeting.end, end: meeting.end + len };
    if (!followedClosely(meeting, meetings, len)) continue;
    if (buffers.some((b) => overlaps(b, wanted))) continue;
    const end = fixed
      .filter((f) => f.id !== meeting.id && f.end > wanted.start)
      .reduce(
        (limit, f) => (f.start < limit ? Math.max(wanted.start, f.start) : limit),
        wanted.end,
      );
    if (end - wanted.start < MIN_BUFFER) continue;
    if (drafts.some((d) => d.start === wanted.start)) continue;
    drafts.push(draft(meeting, { start: wanted.start, end }, prefs.locale));
  }
  return drafts;
}

/** Another meeting starts less than `len` after `meeting` ends (and not before it ends). */
function followedClosely(
  meeting: CalendarEvent,
  meetings: readonly CalendarEvent[],
  len: number,
): boolean {
  return meetings.some(
    (m) => m.id !== meeting.id && m.start >= meeting.end && m.start - meeting.end < len,
  );
}

function draft(after: CalendarEvent, slot: Interval, locale: Locale): EventDraft {
  return {
    title: TITLES[locale],
    start: slot.start,
    end: slot.end,
    timeZone: after.timeZone,
    fixed: false,
    kind: 'buffer',
    attendees: [],
    tags: [],
  };
}
