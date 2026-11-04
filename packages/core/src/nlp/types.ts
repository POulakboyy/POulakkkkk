import type { Locale, Minutes, Priority, TimeZone, Timestamp, WorkMode } from '../model.ts';

export type CaptureKind = 'event' | 'task';

export type PartOfDay = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export type TokenType =
  | 'date'
  | 'time'
  | 'duration'
  | 'deadline'
  | 'recurrence'
  | 'attendee'
  | 'tag'
  | 'priority'
  | 'location';

/**
 * A recognised span of the input, for live highlighting. `start`/`end` are UTF-16 indexes into
 * the original input (`input.slice(start, end) === text`). `value` is the interpreted value:
 * a timestamp for `date`/`deadline`, minutes after midnight for `time`, minutes for `duration`,
 * the level for `priority`, the name for `attendee`/`tag`/`location`, the source phrase for
 * `recurrence`.
 */
export interface ParseToken {
  type: TokenType;
  start: number;
  end: number;
  text: string;
  value?: string | number;
}

export interface ParseContext {
  /** Reference instant ("now"). */
  now: Timestamp;
  /** IANA zone every wall-clock expression is resolved in. */
  timeZone: TimeZone;
  /**
   * Only decides the order of numeric dates (`fr`: 12/03 = 12 March, `en`: 12/03 = 3 December).
   * Words of both languages are always recognised. Defaults to `fr`.
   */
  locale?: Locale;
  /** Length of a timed event without an explicit end or duration. Defaults to 60. */
  defaultEventMin?: Minutes;
}

export interface ParseResult {
  kind: CaptureKind;
  /** Input minus the recognised tokens, tidied and capitalised. */
  title: string;
  /** Start instant; for an all-day item, local midnight of that day. */
  start?: Timestamp;
  /** End instant of an event (exclusive). */
  end?: Timestamp;
  /** Length of a timed event. */
  durationMin?: Minutes;
  /** A date was given without a time: the item floats on that day (`start` = its midnight). */
  allDay?: boolean;
  partOfDay?: PartOfDay;
  attendees: string[];
  tags: string[];
  priority?: Priority;
  /** Effort estimate of a task. */
  estimateMin?: Minutes;
  deadline?: Timestamp;
  /** Source text of a recurrence phrase ("tous les mardis"), for `recurrence/`. */
  recurrence?: string;
  location?: string;
  mode?: WorkMode;
  tokens: ParseToken[];
  /** 0..1 — how sure the parser is of its interpretation (1 = nothing was guessed). */
  confidence: number;
}
