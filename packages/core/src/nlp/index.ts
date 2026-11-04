/**
 * Natural-language capture parser (1.8, 2.7, 2.11) — French and English.
 *
 * `parse` turns a capture line into a task or an event with dates, times, durations, deadlines,
 * attendees, tags, priority, recurrence and work mode, plus character spans for highlighting.
 * `cleanTranscript` and `splitActions` prepare dictated text for it. See README.md.
 */
export { parse } from './parse.ts';
export { cleanTranscript, splitActions } from './voice.ts';
export { inferMode } from './classify.ts';
export type {
  CaptureKind,
  ParseContext,
  ParseResult,
  ParseToken,
  PartOfDay,
  TokenType,
} from './types.ts';
