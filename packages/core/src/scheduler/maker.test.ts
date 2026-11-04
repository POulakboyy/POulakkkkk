import { describe, expect, it } from 'vitest';
import { overlaps } from '../time.ts';
import {
  checkMakerSchedule,
  formatDuration,
  largestFocusBlock,
  suggestAlternatives,
} from './maker.ts';
import { UTC_PREFS, at, event } from './fixtures.test-utils.ts';

const base = { prefs: UTC_PREFS, timeZone: 'UTC' };

describe('checkMakerSchedule', () => {
  // Free 9:00–10:00 and 12:00–18:00 (6 h): the afternoon is the maker block (4 h needed).
  const events = [event('standup', at(2, 10), at(2, 12))];

  it('accepts a meeting that keeps a maker block', () => {
    const r = checkMakerSchedule({
      ...base,
      events,
      candidate: { start: at(2, 16), end: at(2, 17) },
    });
    expect(r).toMatchObject({
      ok: true,
      code: 'ok',
      largestBlockBefore: 360,
      largestBlockAfter: 240,
    });
    expect(r.message).toBe('La journée garde un bloc libre de 4 h.');
  });

  it('flags a meeting that fragments the last maker block', () => {
    const r = checkMakerSchedule({
      ...base,
      events,
      candidate: { start: at(2, 14), end: at(2, 15) },
    });
    expect(r).toMatchObject({
      ok: false,
      code: 'fragments-maker-block',
      fragmented: { start: at(2, 12), end: at(2, 18) },
      largestBlockBefore: 360,
      largestBlockAfter: 180,
    });
    expect(r.message).toContain('3 h');
  });

  it('says so when there is no maker block to protect', () => {
    const busy = [...events, event('lunch', at(2, 14), at(2, 15), { kind: 'personal' })];
    const r = checkMakerSchedule({
      ...base,
      prefs: { ...UTC_PREFS, locale: 'en' },
      events: busy,
      candidate: { start: at(2, 9), end: at(2, 9, 30) },
    });
    expect(r).toMatchObject({ ok: true, code: 'no-maker-block' });
    expect(r.message).toBe('No 4 h focus block is free that day.');
  });

  it('does not count focus events as interruptions and ignores the moved meeting', () => {
    const withFocus = [
      event('focus', at(2, 12), at(2, 16), { kind: 'focus' }),
      event('move-me', at(2, 13), at(2, 14)),
    ];
    const r = checkMakerSchedule({
      ...base,
      events: withFocus,
      candidate: { id: 'move-me', start: at(2, 9), end: at(2, 10) },
    });
    expect(r).toMatchObject({ ok: true, largestBlockBefore: 540, largestBlockAfter: 480 });
  });
});

describe('largestFocusBlock', () => {
  it('returns the largest free block of the working day', () => {
    const r = largestFocusBlock({
      ...base,
      events: [event('m', at(2, 10), at(2, 12))],
      day: at(2, 15),
    });
    expect(r).toEqual({ minutes: 360, block: { start: at(2, 12), end: at(2, 18) } });
  });

  it('returns 0 on a day off', () => {
    expect(largestFocusBlock({ ...base, events: [], day: at(7, 12) })).toEqual({ minutes: 0 });
  });
});

describe('suggestAlternatives', () => {
  const events = [event('standup', at(2, 10), at(2, 12))];
  const candidate = { start: at(2, 14), end: at(2, 15) };

  it('offers free slots that keep the maker block, closest first', () => {
    const r = suggestAlternatives({ ...base, events, candidate, searchDays: 0, stepMin: 60 });
    // 15:00 would leave 3 h + 2 h; ties in distance go to the earlier slot.
    expect(r).toEqual([
      { start: at(2, 13), end: at(2, 14) },
      { start: at(2, 12), end: at(2, 13) },
      { start: at(2, 16), end: at(2, 17) },
    ]);
  });

  it('never overlaps events nor suggests the past', () => {
    const r = suggestAlternatives({ ...base, events, candidate, now: at(2, 16, 30), limit: 20 });
    expect(r.length).toBeGreaterThan(0);
    for (const s of r) {
      expect(s.start).toBeGreaterThanOrEqual(at(2, 16, 30));
      expect(events.some((e) => overlaps(e, s))).toBe(false);
      expect(checkMakerSchedule({ ...base, events, candidate: s }).ok).toBe(true);
    }
  });
});

describe('formatDuration', () => {
  it('formats per locale', () => {
    expect(formatDuration(45, 'fr')).toBe('45 min');
    expect(formatDuration(240, 'en')).toBe('4 h');
    expect(formatDuration(95, 'fr')).toBe('1 h 35');
    expect(formatDuration(65, 'fr')).toBe('1 h 05');
    expect(formatDuration(90, 'en')).toBe('1 h 30 min');
  });
});
