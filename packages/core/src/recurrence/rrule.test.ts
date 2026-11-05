import { describe as group, expect, it } from 'vitest';
import { parseRRule, toRRule } from './rrule.ts';
import type { RecurrenceRule } from './types.ts';

group('parseRRule', () => {
  it('parses every supported part', () => {
    expect(
      parseRRule(
        'RRULE:FREQ=MONTHLY;INTERVAL=2;BYMONTH=1,3;BYMONTHDAY=-1,15;BYDAY=MO,-1FR,+2TU;BYHOUR=9,18;BYMINUTE=30;BYSETPOS=1,-1;COUNT=10;WKST=SU',
      ),
    ).toEqual({
      syntax: 'rrule',
      freq: 'monthly',
      interval: 2,
      byMonth: [1, 3],
      byMonthDay: [-1, 15],
      byDay: [{ weekday: 1 }, { weekday: 5, nth: -1 }, { weekday: 2, nth: 2 }],
      byHour: [9, 18],
      byMinute: [30],
      bySetPos: [-1, 1],
      count: 10,
      wkst: 0,
    });
  });

  it('accepts lower case, a missing prefix and surrounding iCalendar lines', () => {
    const text =
      'DTSTART;TZID=Europe/Paris:20260101T090000\nRRULE:freq=weekly;byday=mo\nEXDATE:20260105';
    expect(parseRRule(text)).toEqual({
      syntax: 'rrule',
      freq: 'weekly',
      interval: 1,
      byDay: [{ weekday: 1 }],
      wkst: 1,
    });
    expect(parseRRule('FREQ=DAILY')?.freq).toBe('daily');
  });

  it('parses the three UNTIL forms', () => {
    expect(parseRRule('FREQ=DAILY;UNTIL=20261231')?.until).toEqual({
      kind: 'local',
      year: 2026,
      month: 12,
      day: 31,
    });
    expect(parseRRule('FREQ=DAILY;UNTIL=20261231T180000')?.until).toEqual({
      kind: 'local',
      year: 2026,
      month: 12,
      day: 31,
      time: { hour: 18, minute: 0, second: 0 },
    });
    expect(parseRRule('FREQ=DAILY;UNTIL=20261231T170000Z')?.until).toEqual({
      kind: 'instant',
      at: Date.UTC(2026, 11, 31, 17),
    });
  });

  it.each([
    ['unsupported frequency', 'FREQ=SECONDLY'],
    ['missing frequency', 'INTERVAL=2'],
    ['unsupported part', 'FREQ=YEARLY;BYYEARDAY=100'],
    ['BYSECOND', 'FREQ=DAILY;BYSECOND=0'],
    ['zero interval', 'FREQ=DAILY;INTERVAL=0'],
    ['COUNT with UNTIL', 'FREQ=DAILY;COUNT=2;UNTIL=20261231'],
    ['month day zero', 'FREQ=MONTHLY;BYMONTHDAY=0'],
    ['month day 32', 'FREQ=MONTHLY;BYMONTHDAY=32'],
    ['month 13', 'FREQ=YEARLY;BYMONTH=13'],
    ['hour 24', 'FREQ=DAILY;BYHOUR=24'],
    ['bad weekday', 'FREQ=WEEKLY;BYDAY=XX'],
    ['ordinal in a weekly rule', 'FREQ=WEEKLY;BYDAY=1MO'],
    ['monthly ordinal beyond 5', 'FREQ=MONTHLY;BYDAY=6MO'],
    ['duplicated part', 'FREQ=DAILY;FREQ=WEEKLY'],
    ['malformed part', 'FREQ=DAILY;COUNT'],
    ['bad UNTIL', 'FREQ=DAILY;UNTIL=2026-12-31'],
    ['empty list', 'FREQ=DAILY;BYHOUR='],
  ])('rejects %s', (_, text) => {
    expect(parseRRule(text)).toBeNull();
  });
});

group('toRRule', () => {
  it.each([
    'FREQ=DAILY',
    'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE',
    'FREQ=MONTHLY;BYDAY=-1FR;COUNT=5',
    'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-2',
    'FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=1;BYHOUR=9;BYMINUTE=0',
    'FREQ=DAILY;UNTIL=20261231',
    'FREQ=DAILY;UNTIL=20261231T180000',
    'FREQ=HOURLY;INTERVAL=3;UNTIL=19970902T210000Z',
    'FREQ=WEEKLY;BYDAY=TU,SU;WKST=SU',
  ])('round-trips %s', (text) => {
    const rule = parseRRule(text);
    expect(rule && toRRule(rule)).toBe(text);
  });

  const base: RecurrenceRule = { syntax: 'literal', freq: 'monthly', interval: 1, wkst: 1 };

  it('returns null for what RFC 5545 cannot express', () => {
    expect(toRRule({ ...base, excludeHolidays: true })).toBeNull();
    expect(
      toRRule({ ...base, byMonthDay: [1], byDay: [{ weekday: 1 }], dayMatch: 'any' }),
    ).toBeNull();
    expect(toRRule({ ...base, until: { kind: 'local', month: 12, day: 31 } })).toBeNull();
    expect(toRRule({ ...base, count: 2, until: { kind: 'instant', at: 0 } })).toBeNull();
  });
});
