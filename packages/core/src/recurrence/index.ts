/**
 * Recurrence engine (feature 2.9): literal FR/EN phrases, five-field cron and iCalendar RRULE
 * all compile to one `RecurrenceRule`, expanded DST-correctly in an explicit IANA zone.
 */
import { parseCron } from './cron.ts';
import { parseLiteral, type ParseOptions } from './literal.ts';
import { looksLikeRRule, parseRRule } from './rrule.ts';
import type { RecurrenceRule } from './types.ts';

export type {
  Frequency,
  LocalTime,
  RecurrenceRule,
  RuleSyntax,
  Until,
  Weekday,
  WeekdayRef,
} from './types.ts';
export type { RuleLocale } from './vocab.ts';
export type { ParseOptions } from './literal.ts';
export type { DescribeOptions } from './describe.ts';
export type { NextOptions, OccurrenceOptions } from './expand.ts';
export { DEFAULT_LIMIT, next, occurrences } from './expand.ts';
export { describe } from './describe.ts';
export { toRRule } from './rrule.ts';
export { parseCron, parseLiteral, parseRRule };

/**
 * Parses `text` in whichever syntax it uses: an RRULE when it contains `FREQ=`, a cron
 * expression when it is five valid cron fields or an `@` macro, a literal phrase otherwise.
 * Returns `null` when the text is not fully understood.
 */
export function parseRule(text: string, opts: ParseOptions = {}): RecurrenceRule | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (looksLikeRRule(trimmed)) return parseRRule(trimmed);
  return parseCron(trimmed) ?? parseLiteral(trimmed, opts);
}
