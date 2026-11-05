import { describe, expect, it } from 'vitest';
import { DAY, fromZoned, type CalendarEvent } from '@pouxis/core';
import { eventFields, formFromInstance, formInterval, fromInputs, retimeSeries } from './form.ts';
import { periodBounds, periodProgress } from './progress.ts';

const TZ = 'Europe/Paris';
const at = (month: number, day: number, hour = 0, minute = 0, year = 2026) =>
  fromZoned({ year, month, day, hour, minute }, TZ);

const series: CalendarEvent = {
  id: 's',
  createdAt: 0,
  updatedAt: 0,
  title: 'Standup',
  start: at(11, 2, 9, 30),
  end: at(11, 2, 9, 45),
  timeZone: TZ,
  fixed: false,
  kind: 'meeting',
  attendees: ['paul'],
  tags: [],
  recurrence: 'FREQ=DAILY',
};
const occurrence = {
  key: 's@x',
  event: series,
  start: at(11, 4, 9, 30),
  end: at(11, 4, 9, 45),
  recurring: true,
};

describe('form', () => {
  it('reads date and time inputs in the given zone', () => {
    expect(fromInputs('2026-11-04', '14:30', TZ)).toBe(at(11, 4, 14, 30));
    expect(fromInputs('2026-13-04', '14:30', TZ)).toBeNull();
    expect(fromInputs('2026-11-04', '25:00', TZ)).toBeNull();
    expect(fromInputs('', '14:30', TZ)).toBeNull();
  });

  it('reads an end before the start as the next day and rejects empty spans', () => {
    const base = formFromInstance(occurrence, TZ);
    expect(base).toMatchObject({
      date: '2026-11-04',
      startTime: '09:30',
      endTime: '09:45',
      recurrence: 'FREQ=DAILY',
    });
    expect(formInterval({ ...base, startTime: '23:00', endTime: '00:30' }, TZ)).toEqual({
      start: at(11, 4, 23),
      end: at(11, 5, 0, 30),
    });
    expect(formInterval({ ...base, endTime: '09:30' }, TZ)).toBeNull();
  });

  it('shifts a whole series when one occurrence moves, a single event as is', () => {
    expect(retimeSeries(occurrence, at(11, 4, 10), at(11, 4, 10, 30))).toEqual({
      start: at(11, 2, 10),
      end: at(11, 2, 10, 30),
    });
    const single = { ...occurrence, recurring: false };
    expect(retimeSeries(single, 1, 2)).toEqual({ start: 1, end: 2 });
    const fields = eventFields(
      { ...formFromInstance(occurrence, TZ), title: '  Daily  ', recurrence: ' ' },
      { start: at(11, 4, 9), end: at(11, 4, 9, 15) },
      TZ,
      occurrence,
    );
    expect(fields).toMatchObject({ title: 'Daily', start: at(11, 2, 9), recurrence: undefined });
  });
});

describe('progress', () => {
  it('measures the year, quarter and week in local time', () => {
    const now = at(11, 4, 12);
    expect(periodBounds('quarter', now, TZ)).toEqual({
      start: at(10, 1),
      end: at(1, 1, 0, 0, 2027),
    });
    expect(periodBounds('week', now, TZ)).toEqual({ start: at(11, 2), end: at(11, 9) });
    const week = periodProgress('week', now, TZ);
    expect(week.ratio).toBeCloseTo(2.5 / 7, 5);
    const year = periodProgress('year', at(1, 1), TZ);
    expect(year.ratio).toBe(0);
    expect(year.end - year.start).toBe(365 * DAY);
  });
});
