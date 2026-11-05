/**
 * Memoised UTC offsets for one expansion run.
 *
 * `tzOffset` goes through `Intl.DateTimeFormat#formatToParts`, which dominated expansion time
 * (three calls per occurrence). Offsets are sampled once per UTC midnight instead: when the
 * samples on both sides of an instant agree, the instant shares that offset; otherwise a DST
 * change happens that day and the exact offset is computed. This relies on the assumption the
 * expansion engine already makes — at most one offset change within any 48 hours — so it
 * never changes a result.
 */
import type { TimeZone, Timestamp } from '../model.ts';
import { DAY, tzOffset } from '../time.ts';

export type OffsetLookup = (ts: Timestamp) => number;

export function createOffsetLookup(timeZone: TimeZone): OffsetLookup {
  const samples = new Map<number, number>();
  const sample = (day: number): number => {
    let offset = samples.get(day);
    if (offset === undefined) {
      offset = tzOffset(day * DAY, timeZone);
      samples.set(day, offset);
    }
    return offset;
  };
  return (ts) => {
    const day = Math.floor(ts / DAY);
    const before = sample(day);
    return before === sample(day + 1) ? before : tzOffset(ts, timeZone);
  };
}
