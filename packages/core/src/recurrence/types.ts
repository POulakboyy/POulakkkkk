/**
 * Recurrence rule AST shared by the three input syntaxes (literal FR/EN, cron, iCalendar RRULE).
 *
 * The model follows RFC 5545 `RRULE` semantics with two extensions that RRULE cannot express:
 * `excludeHolidays` ("ouvré" / working days) and `dayMatch: 'any'` (cron's day-of-month OR
 * day-of-week rule). Optional fields are omitted rather than set to `undefined`; lists are
 * sorted and deduplicated by the parsers.
 */
import type { Timestamp } from '../model.ts';

export type Frequency = 'yearly' | 'monthly' | 'weekly' | 'daily' | 'hourly' | 'minutely';

/** 0 = Sunday … 6 = Saturday, like `time.ts`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WeekdayRef {
  weekday: Weekday;
  /**
   * Ordinal inside the month (`1` = first, `-1` = last). For a yearly rule without `byMonth`
   * the ordinal counts inside the year, as in RFC 5545. Omitted = every such weekday.
   */
  nth?: number;
}

export interface LocalTime {
  hour: number;
  minute: number;
  second: number;
}

/** End of the series, inclusive. */
export type Until =
  /** An absolute instant (RRULE `UNTIL=…Z`). */
  | { kind: 'instant'; at: Timestamp }
  /**
   * A wall-clock date in the zone passed to `occurrences`. Without `time` the whole day is
   * included. Without `year` (literal "jusqu'au 31 décembre") it resolves to the first such
   * date on or after the series start.
   */
  | { kind: 'local'; year?: number; month: number; day: number; time?: LocalTime };

export type RuleSyntax = 'literal' | 'cron' | 'rrule';

export interface RecurrenceRule {
  /** Syntax the rule was parsed from (informational). */
  syntax: RuleSyntax;
  freq: Frequency;
  /** ≥ 1: every `interval` periods of `freq`, counted from the series start. */
  interval: number;
  /** 1–12. */
  byMonth?: number[];
  /** 1–31 or -31–-1 (from the end of the month). */
  byMonthDay?: number[];
  byDay?: WeekdayRef[];
  /** 0–23. Omitted: the hour of the series start (or every hour for sub-daily rules). */
  byHour?: number[];
  /** 0–59. Omitted: the minute of the series start (or every minute for `minutely`). */
  byMinute?: number[];
  /** Positions inside each period's ordered set of instances (1 = first, -1 = last). */
  bySetPos?: number[];
  /**
   * `'any'`: a day matches when it satisfies `byMonthDay` OR `byDay` (cron, when both fields
   * are restricted). Default: both must match (RFC 5545).
   */
  dayMatch?: 'any';
  /**
   * Drop holidays (passed to `occurrences`) from each period's candidate days *before*
   * `bySetPos` is applied. Combined with Monday–Friday in `byDay` this models French
   * "jours ouvrés": "le 3ᵉ mardi ouvré" is the third Tuesday of the month that is not a holiday.
   */
  excludeHolidays?: boolean;
  /** Number of occurrences of the whole series, counted from the series start. */
  count?: number;
  until?: Until;
  /** Week start used by weekly periods (RRULE `WKST`), default Monday. */
  wkst: Weekday;
}
