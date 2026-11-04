import { describe, expect, it } from 'vitest';
import { DAY, HOUR, MINUTE, fromZoned, zonedParts } from '../time.ts';
import { node } from './test-utils.ts';
import { createTimeScale, dragToDue, placeOnTimeline, timeTicks } from './timeline.ts';

const PARIS = 'Europe/Paris';
const start = fromZoned({ year: 2026, month: 3, day: 23 }, PARIS);

describe('createTimeScale', () => {
  const scale = createTimeScale({ start, end: start + 7 * DAY, x0: 0, x1: 700, timeZone: PARIS });

  it('maps time to x linearly and back, extrapolating outside the range', () => {
    expect(scale.toX(start)).toBe(0);
    expect(scale.toX(start + DAY)).toBeCloseTo(100);
    expect(scale.toX(start - DAY)).toBeCloseTo(-100);
    expect(scale.toTime(350)).toBe(start + 3.5 * DAY);
    expect(scale.toTime(scale.toX(start + 12345))).toBe(start + 12345);
  });

  it('rejects degenerate scales', () => {
    expect(() => createTimeScale({ start, end: start, x0: 0, x1: 1, timeZone: PARIS })).toThrow(
      RangeError,
    );
    expect(() => createTimeScale({ start, end: start + 1, x0: 5, x1: 5, timeZone: PARIS })).toThrow(
      RangeError,
    );
    expect(() =>
      createTimeScale({ start: Number.NaN, end: 1, x0: 0, x1: 1, timeZone: PARIS }),
    ).toThrow(RangeError);
  });

  it('puts day ticks on local midnight across the spring DST change', () => {
    const ticks = scale.ticks(7);
    expect(ticks.length).toBeGreaterThanOrEqual(7);
    for (const tick of ticks) {
      expect(tick.unit).toBe('day');
      const p = zonedParts(tick.ts, PARIS);
      expect([p.hour, p.minute]).toEqual([0, 0]);
      expect(tick.x).toBeCloseTo(scale.toX(tick.ts));
    }
    // 2026-03-29 is 23 hours long in Paris.
    const short = ticks.findIndex((t) => zonedParts(t.ts, PARIS).day === 29);
    expect((ticks[short + 1]?.ts ?? 0) - (ticks[short]?.ts ?? 0)).toBe(23 * HOUR);
  });

  it('picks units that match the span and flags majors', () => {
    const hourTicks = timeTicks(start, start + DAY, 8, PARIS);
    expect(hourTicks[0]?.unit).toBe('hour');
    expect(hourTicks[0]?.major).toBe(true);
    const monthTicks = timeTicks(start, start + 400 * DAY, 12, PARIS);
    expect(monthTicks[0]?.unit).toBe('month');
    for (const t of monthTicks) expect(zonedParts(t.ts, PARIS).day).toBe(1);
    expect(monthTicks.some((t) => t.major && zonedParts(t.ts, PARIS).month === 1)).toBe(true);
    const yearTicks = timeTicks(start, start + 100 * 365 * DAY, 5, PARIS);
    expect(yearTicks[0]?.unit).toBe('year');
    expect(timeTicks(start, start + 10 * MINUTE, 10, PARIS)[0]?.unit).toBe('minute');
  });

  it('supports reversed axes', () => {
    const reversed = createTimeScale({ start, end: start + DAY, x0: 100, x1: 0, timeZone: PARIS });
    expect(reversed.pxPerMs).toBeLessThan(0);
    expect(reversed.toX(start + DAY / 2)).toBeCloseTo(50);
    expect(reversed.ticks(4).length).toBeGreaterThan(0);
  });
});

describe('dragToDue', () => {
  const scale = createTimeScale({ start, end: start + 10 * DAY, x0: 0, x1: 1000, timeZone: PARIS });

  it('sets the due date from x without snapping', () => {
    const moved = dragToDue(node('a'), 250, scale);
    expect(moved).toMatchObject({ x: 250, due: start + 2.5 * DAY });
  });

  it('snaps to local midnight and to fixed steps, moving x onto the slot', () => {
    const day = dragToDue(node('a'), 240, scale, { snap: 'day' });
    expect(zonedParts(day.due as number, PARIS)).toMatchObject({ day: 25, hour: 0, minute: 0 });
    expect(day.x).toBeCloseTo(scale.toX(day.due as number));
    const quarter = dragToDue(node('a'), 101, scale, { snap: 15 * MINUTE });
    expect(((quarter.due as number) - start) % (15 * MINUTE)).toBe(0);
  });

  it('places nodes with a due date on the axis and leaves the others', () => {
    const g = { nodes: [node('a', 5, 9, { due: start + DAY }), node('b', 7, 7)], edges: [] };
    const placed = placeOnTimeline(g, scale);
    expect(placed.nodes[0]).toMatchObject({ x: 100, y: 9 });
    expect(placed.nodes[1]).toBe(g.nodes[1]);
    expect(placeOnTimeline(placed, scale)).toBe(placed);
  });
});
