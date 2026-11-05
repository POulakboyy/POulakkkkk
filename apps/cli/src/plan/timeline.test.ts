import { describe, expect, it } from 'vitest';
import { fromZoned } from '@pouxis/core';
import { PLAIN } from '../output.ts';
import { hasOverlap, renderTimeline, timelineBounds } from './timeline.ts';
import type { TimelineItem, TimelineOptions } from './timeline.ts';

const timeZone = 'Europe/Paris';
const at = (h: number, m = 0, day = 8) =>
  fromZoned({ year: 2026, month: 10, day, hour: h, minute: m }, timeZone);
const options: TimelineOptions = {
  day: at(0),
  timeZone,
  stepMin: 60,
  workStart: 9 * 60,
  workEnd: 12 * 60,
  nowLabel: '◂ now',
  c: PLAIN,
  width: Number.POSITIVE_INFINITY,
};

describe('renderTimeline', () => {
  it('draws one row per step with markers and labels on the first row', () => {
    const items: TimelineItem[] = [
      { kind: 'event', start: at(9), end: at(11), label: 'Meeting' },
      { kind: 'task', start: at(11), end: at(11, 30), label: 'Write', proposed: true },
    ];
    expect(renderTimeline(items, { ...options, now: at(10, 15) })).toEqual([
      '09:00 │ ## Meeting 09:00–11:00',
      '10:00 │ ## ◂ now',
      '11:00 │ == Write 11:00–11:30',
    ]);
  });

  it('flags real overlaps only', () => {
    const lines = renderTimeline(
      [
        { kind: 'event', start: at(9), end: at(10), label: 'A' },
        { kind: 'task', start: at(9, 30), end: at(10), label: 'B' },
      ],
      options,
    );
    expect(lines[0]).toBe('09:00 │ !! A 09:00–10:00 · B 09:30–10:00');
    expect(
      hasOverlap([
        { kind: 'task', start: 0, end: 10, label: '' },
        { kind: 'task', start: 10, end: 20, label: '' },
      ]),
    ).toBe(false);
  });

  it('extends the rows beyond working hours to show every item', () => {
    const items: TimelineItem[] = [{ kind: 'event', start: at(7, 30), end: at(8), label: 'Run' }];
    expect(timelineBounds(items, { ...options, stepMin: 30 })).toEqual([450, 720]);
    // An item running past midnight stops the timeline at the end of the day.
    expect(
      timelineBounds([{ kind: 'event', start: at(22), end: at(2, 0, 9), label: 'x' }], options)[1],
    ).toBe(1440);
  });
});
