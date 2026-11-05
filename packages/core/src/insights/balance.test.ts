import { describe, expect, it } from 'vitest';
import { HOUR } from '../time.ts';
import { balance } from './balance.ts';
import { at, focus, meeting, task, TZ } from './fixtures.test-utils.ts';

const MON = at(2026, 3, 2);
const WEEK_RANGE = { start: MON, end: at(2026, 3, 9) };

describe('balance', () => {
  it('returns empty totals and a day per local day when nothing was tracked', () => {
    const b = balance({ tasks: [], events: [], range: WEEK_RANGE, timeZone: TZ });
    expect(b.total).toBe(0);
    expect(b.ratio).toBeNull();
    expect(b.shares).toBeNull();
    expect(b.days.map((d) => d.day)).toEqual([
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
    ]);
    expect(b.days.every((d) => d.ratio === null)).toBe(true);
  });

  it('sums creation, organisation and meetings with ratio and shares', () => {
    const create = task({ mode: 'create', timeLogs: [focus(at(2026, 3, 2, 9), 120)] });
    const organize = task({ mode: 'organize', timeLogs: [focus(at(2026, 3, 3, 14), 60)] });
    const events = [
      meeting(at(2026, 3, 4, 10), 60),
      meeting(at(2026, 3, 4, 11), 30, { kind: 'focus' }),
    ];
    const b = balance({ tasks: [create, organize], events, range: WEEK_RANGE, timeZone: TZ });
    expect(b.create).toBe(120);
    expect(b.organize).toBe(60);
    expect(b.meetings).toBe(60);
    expect(b.total).toBe(240);
    expect(b.ratio).toBe(0.5);
    expect(b.shares).toEqual({ create: 0.5, organize: 0.25, meetings: 0.25 });
    expect(b.days[0]?.create).toBe(120);
    expect(b.days[1]?.organize).toBe(60);
    expect(b.days[2]?.meetings).toBe(60);
  });

  it('never counts a minute twice', () => {
    const start = at(2026, 3, 2, 9);
    const a = task({ mode: 'create', timeLogs: [focus(start, 60), focus(start + HOUR / 2, 60)] });
    const o = task({ mode: 'organize', timeLogs: [focus(start + HOUR, 60)] });
    // Meeting fully covered by logged focus: the log is the ground truth.
    const m = meeting(start, 60);
    const b = balance({ tasks: [a, o], events: [m], range: WEEK_RANGE, timeZone: TZ });
    // Create 9:00–10:30, organize 10:00–11:00 → overlap 10:00–10:30 split half/half.
    expect(b.create).toBe(75);
    expect(b.organize).toBe(45);
    expect(b.meetings).toBe(0);
    expect(b.total).toBe(120);
  });

  it('clips to the range and splits logs at local midnight', () => {
    const t = task({ timeLogs: [focus(at(2026, 3, 1, 23), 120)] }); // Sun 23:00 → Mon 01:00
    const late = task({ timeLogs: [focus(at(2026, 3, 3, 23), 120)] }); // Tue 23:00 → Wed 01:00
    const b = balance({ tasks: [t, late], events: [], range: WEEK_RANGE, timeZone: TZ });
    expect(b.create).toBe(180);
    expect(b.days[0]?.create).toBe(60);
    expect(b.days[1]?.create).toBe(60);
    expect(b.days[2]?.create).toBe(60);
  });

  it('follows DST-length days in the requested zone', () => {
    const range = { start: at(2026, 3, 29), end: at(2026, 3, 30) };
    const m = meeting(at(2026, 3, 29), 24 * 60);
    const b = balance({ tasks: [], events: [m], range, timeZone: TZ });
    expect(b.days).toHaveLength(1);
    expect(b.days[0]?.day).toBe('2026-03-29');
    expect(b.meetings).toBe(23 * 60);
  });

  it('ignores breaks, invalid logs and empty meetings', () => {
    const start = at(2026, 3, 2, 9);
    const t = task({
      timeLogs: [
        { start, end: start + HOUR, kind: 'break' },
        { start, end: start, kind: 'focus' },
        { start: Number.NaN, end: start, kind: 'focus' },
      ],
    });
    const m = meeting(start, 0);
    const b = balance({ tasks: [t], events: [m], range: WEEK_RANGE, timeZone: TZ });
    expect(b.total).toBe(0);
  });

  it('handles partial-day ranges and validates bounds', () => {
    const range = { start: at(2026, 3, 2, 12), end: at(2026, 3, 3, 12) };
    const b = balance({ tasks: [], events: [], range, timeZone: TZ });
    expect(b.days.map((d) => [d.start, d.end])).toEqual([
      [range.start, at(2026, 3, 3)],
      [at(2026, 3, 3), range.end],
    ]);
    expect(
      balance({ tasks: [], events: [], range: { start: MON, end: MON }, timeZone: TZ }).days,
    ).toEqual([]);
    expect(() =>
      balance({ tasks: [], events: [], range: { start: MON, end: MON - 1 }, timeZone: TZ }),
    ).toThrow(RangeError);
    expect(() =>
      balance({ tasks: [], events: [], range: { start: Number.NaN, end: MON }, timeZone: TZ }),
    ).toThrow(RangeError);
  });
});
