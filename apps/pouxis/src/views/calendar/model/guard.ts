/**
 * Checks run before a meeting is created or moved: the maker-schedule guard (1.15) and the
 * transition buffers it would need (1.6). Pure: the caller decides what to apply.
 */
import {
  MINUTE,
  overlaps,
  scheduler,
  type CalendarEvent,
  type EventKind,
  type Interval,
  type Timestamp,
  type UserPrefs,
} from '@pouxis/core';

export interface MeetingReview {
  /** `null` when the event is not a meeting (focus blocks, personal time… are never flagged). */
  maker: scheduler.MakerCheck | null;
  /** Nearby slots that keep the maker block, when the candidate breaks it. */
  alternatives: Interval[];
  /** Buffers the candidate calls for, next to it. */
  buffers: scheduler.EventDraft[];
}

export interface ReviewInput {
  candidate: Interval & { id?: string };
  kind: EventKind;
  /** Events around the candidate (recurring occurrences already expanded). */
  events: readonly CalendarEvent[];
  prefs: UserPrefs;
  now: Timestamp;
}

export function reviewMeeting(input: ReviewInput): MeetingReview {
  if (input.kind !== 'meeting') return { maker: null, alternatives: [], buffers: [] };
  const { candidate, prefs } = input;
  const others = input.events.filter((e) => e.id !== candidate.id);
  const timeZone = prefs.timeZone;
  const maker = scheduler.checkMakerSchedule({ events: others, candidate, prefs, timeZone });
  const alternatives = maker.ok
    ? []
    : scheduler.suggestAlternatives({
        events: others,
        candidate,
        prefs,
        timeZone,
        now: input.now,
        limit: 3,
      });
  return { maker, alternatives, buffers: buffersAround(candidate, others, prefs) };
}

/** Buffers `insertBuffers` would add right before or after `candidate`. */
export function buffersAround(
  candidate: Interval & { id?: string },
  events: readonly CalendarEvent[],
  prefs: UserPrefs,
): scheduler.EventDraft[] {
  const probe: CalendarEvent = {
    id: candidate.id ?? '\u0000candidate',
    createdAt: 0,
    updatedAt: 0,
    title: '',
    start: candidate.start,
    end: candidate.end,
    timeZone: prefs.timeZone,
    fixed: false,
    kind: 'meeting',
    attendees: [],
    tags: [],
  };
  const reach = scheduler.bufferLengthMs(prefs.bufferMin) + MINUTE;
  const near = { start: candidate.start - reach, end: candidate.end + reach };
  return scheduler
    .insertBuffers([...events, probe], prefs)
    .filter((draft) => overlaps(draft, near));
}
