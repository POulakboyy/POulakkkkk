/** Types shared by the matchers and the assembler; not part of the public API. */
import type { Locale, Minutes, Priority, TimeZone, Timestamp } from '../model.ts';
import type { CalDate } from './calendar.ts';
import type { PartOfDay, TokenType } from './types.ts';

export interface Ctx {
  raw: string;
  /** `fold(raw)`, index-aligned with `raw`. */
  f: string;
  now: Timestamp;
  timeZone: TimeZone;
  today: CalDate;
  locale: Locale;
  /** Whether the caller set the locale explicitly (numeric dates are then unambiguous). */
  localeGiven: boolean;
}

/** A resolved date: a calendar day, or an exact instant for "dans 2h". */
export interface DateSpec {
  cal?: CalDate;
  instant?: Timestamp;
  pod?: PartOfDay;
  /** A bare weekday that fell on today: move it a week on when its time has already passed. */
  rollWeek?: boolean;
  confidence: number;
}

/** A time of day in minutes after midnight (1440 = the following midnight). */
export interface TimeSpec {
  start: Minutes;
  end?: Minutes;
  pod?: PartOfDay;
  confidence: number;
}

export type HitData =
  | { k: 'date'; spec: DateSpec }
  | { k: 'time'; time: TimeSpec }
  | {
      k: 'duration';
      minutes: Minutes;
      /** Unprefixed "3h": the time of day it could also be. */ clock?: Minutes;
    }
  | { k: 'deadline'; spec?: DateSpec; time?: TimeSpec; exclusive: boolean }
  | { k: 'recurrence'; weekdays: number[] }
  | { k: 'attendee'; name: string }
  | { k: 'tag'; name: string }
  | { k: 'priority'; level: Priority }
  | {
      k: 'location';
      name: string;
      confidence: number;
      /** Introduced by à/au/at: may be a person. */ weak: boolean;
    };

export interface Hit {
  type: TokenType;
  start: number;
  end: number;
  data: HitData;
}

export type Matcher = (c: Ctx, pos: number) => Hit | null;
