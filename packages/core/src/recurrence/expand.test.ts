import { describe as group, expect, it } from 'vitest';
import { next, occurrences } from './expand.ts';
import { at, local, locals, NEW_YORK, PARIS } from './fixtures.test-utils.ts';
import { parseRRule } from './rrule.ts';
import type { RecurrenceRule } from './types.ts';

function rrule(text: string): RecurrenceRule {
  const rule = parseRRule(text);
  if (!rule) throw new Error(`Unparseable test rule ${text}`);
  return rule;
}

/** Expands `text` from `start` (also DTSTART) for at most `limit` instants, as local text. */
function expand(
  text: string,
  start: string,
  tz: string,
  extra: { to?: string; limit?: number; holidays?: string[] } = {},
): string[] {
  const dtstart = at(start, tz);
  const opts = {
    from: dtstart,
    to: extra.to ? at(extra.to, tz) : Infinity,
    timeZone: tz,
    dtstart,
    limit: extra.limit ?? 50,
    ...(extra.holidays ? { holidays: extra.holidays } : {}),
  };
  return locals(occurrences(rrule(text), opts), tz);
}

group('occurrences — DST', () => {
  it('keeps 09:00 wall-clock across the Paris spring-forward change', () => {
    const rule = rrule('FREQ=DAILY;BYHOUR=9;BYMINUTE=0');
    const list = occurrences(rule, {
      from: at('2026-03-28', PARIS),
      to: at('2026-03-31', PARIS),
      timeZone: PARIS,
    });
    expect(locals(list, PARIS)).toEqual([
      '2026-03-28 09:00',
      '2026-03-29 09:00',
      '2026-03-30 09:00',
    ]);
    expect(list.map((ts) => new Date(ts).toISOString())).toEqual([
      '2026-03-28T08:00:00.000Z',
      '2026-03-29T07:00:00.000Z',
      '2026-03-30T07:00:00.000Z',
    ]);
  });

  it('keeps 09:00 wall-clock across both New York changes', () => {
    const spring = expand('FREQ=WEEKLY;BYDAY=SU', '2026-03-01 09:00', NEW_YORK, { limit: 2 });
    expect(spring).toEqual(['2026-03-01 09:00', '2026-03-08 09:00']);
    const fall = expand('FREQ=DAILY;COUNT=3', '2026-10-31 09:00', NEW_YORK);
    expect(fall).toEqual(['2026-10-31 09:00', '2026-11-01 09:00', '2026-11-02 09:00']);
  });

  it('moves a time skipped by spring-forward to the next valid instant', () => {
    const list = expand('FREQ=DAILY;BYHOUR=2;BYMINUTE=30;COUNT=3', '2026-03-28', PARIS);
    expect(list).toEqual(['2026-03-28 02:30', '2026-03-29 03:30', '2026-03-30 02:30']);
  });

  it('resolves a repeated fall-back time to its first instant, once, east and west of UTC', () => {
    const paris = occurrences(rrule('FREQ=DAILY;BYHOUR=2;BYMINUTE=30'), {
      from: Date.UTC(2026, 9, 24, 12),
      to: Date.UTC(2026, 9, 25, 12),
      timeZone: PARIS,
    });
    expect(paris.map((ts) => new Date(ts).toISOString())).toEqual(['2026-10-25T00:30:00.000Z']);
    const newYork = occurrences(rrule('FREQ=DAILY;BYHOUR=1;BYMINUTE=30'), {
      from: Date.UTC(2026, 10, 1),
      to: Date.UTC(2026, 10, 2),
      timeZone: NEW_YORK,
    });
    expect(newYork.map((ts) => new Date(ts).toISOString())).toEqual(['2026-11-01T05:30:00.000Z']);
  });

  it('emits both instants of a repeated hour for hourly rules', () => {
    for (const [tz, from] of [
      [NEW_YORK, Date.UTC(2026, 10, 1, 4)],
      [PARIS, Date.UTC(2026, 9, 24, 22)],
    ] as const) {
      const list = occurrences(rrule('FREQ=HOURLY'), {
        from,
        to: from + 4 * 3_600_000,
        timeZone: tz,
      });
      expect(list).toEqual([0, 1, 2, 3].map((h) => from + h * 3_600_000));
    }
  });

  it('never emits duplicates for hourly rules through the spring gap', () => {
    const list = expand('FREQ=HOURLY', '2026-03-29 00:00', PARIS, { to: '2026-03-29 05:00' });
    expect(list).toEqual([
      '2026-03-29 00:00',
      '2026-03-29 01:00',
      '2026-03-29 03:00',
      '2026-03-29 04:00',
    ]);
  });
});

group('occurrences — RFC 5545 examples (America/New_York)', () => {
  it('WKST changes which days an every-other-week rule picks', () => {
    const mo = expand(
      'FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU;WKST=MO',
      '1997-08-05 09:00',
      NEW_YORK,
    );
    expect(mo).toEqual([
      '1997-08-05 09:00',
      '1997-08-10 09:00',
      '1997-08-19 09:00',
      '1997-08-24 09:00',
    ]);
    const su = expand(
      'FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU;WKST=SU',
      '1997-08-05 09:00',
      NEW_YORK,
    );
    expect(su).toEqual([
      '1997-08-05 09:00',
      '1997-08-17 09:00',
      '1997-08-19 09:00',
      '1997-08-31 09:00',
    ]);
  });

  it('second-to-last weekday of the month (BYSETPOS=-2)', () => {
    const list = expand(
      'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-2',
      '1997-09-29 09:00',
      NEW_YORK,
      { limit: 7 },
    );
    expect(list.map((s) => s.slice(0, 10))).toEqual([
      '1997-09-29',
      '1997-10-30',
      '1997-11-27',
      '1997-12-30',
      '1998-01-29',
      '1998-02-26',
      '1998-03-30',
    ]);
  });

  it('every Friday the 13th', () => {
    const list = expand('FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13', '1997-09-02 09:00', NEW_YORK, {
      limit: 5,
    });
    expect(list.map((s) => s.slice(0, 10))).toEqual([
      '1998-02-13',
      '1998-03-13',
      '1998-11-13',
      '1999-08-13',
      '2000-10-13',
    ]);
  });

  it('first Saturday following the first Sunday of the month', () => {
    const list = expand(
      'FREQ=MONTHLY;BYDAY=SA;BYMONTHDAY=7,8,9,10,11,12,13',
      '1997-09-13 09:00',
      NEW_YORK,
      { limit: 4 },
    );
    expect(list.map((s) => s.slice(0, 10))).toEqual([
      '1997-09-13',
      '1997-10-11',
      '1997-11-08',
      '1997-12-13',
    ]);
  });

  it('US presidential election day, every four years', () => {
    const list = expand(
      'FREQ=YEARLY;INTERVAL=4;BYMONTH=11;BYDAY=TU;BYMONTHDAY=2,3,4,5,6,7,8',
      '1996-11-05 09:00',
      NEW_YORK,
      { limit: 3 },
    );
    expect(list.map((s) => s.slice(0, 10))).toEqual(['1996-11-05', '2000-11-07', '2004-11-02']);
  });

  it('every three hours until an absolute UNTIL instant', () => {
    const list = expand(
      'FREQ=HOURLY;INTERVAL=3;UNTIL=19970902T210000Z',
      '1997-09-02 09:00',
      NEW_YORK,
    );
    expect(list).toEqual(['1997-09-02 09:00', '1997-09-02 12:00', '1997-09-02 15:00']);
  });

  it('every 15 minutes for 6 occurrences', () => {
    const list = expand('FREQ=MINUTELY;INTERVAL=15;COUNT=6', '1997-09-02 09:00', NEW_YORK);
    expect(list.map((s) => s.slice(11))).toEqual([
      '09:00',
      '09:15',
      '09:30',
      '09:45',
      '10:00',
      '10:15',
    ]);
  });
});

group('occurrences — calendar edge cases', () => {
  it('skips months without a 31st instead of clamping', () => {
    const list = expand('FREQ=MONTHLY;BYMONTHDAY=31', '2026-01-31 08:00', PARIS, { limit: 4 });
    expect(list.map((s) => s.slice(0, 10))).toEqual([
      '2026-01-31',
      '2026-03-31',
      '2026-05-31',
      '2026-07-31',
    ]);
  });

  it('last day of the month follows leap years', () => {
    const list = expand('FREQ=MONTHLY;BYMONTHDAY=-1;BYMONTH=2', '2027-01-01', PARIS, { limit: 3 });
    expect(list.map((s) => s.slice(0, 10))).toEqual(['2027-02-28', '2028-02-29', '2029-02-28']);
  });

  it('29 February only occurs in leap years (2100 is not one)', () => {
    const list = expand('FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29', '2096-01-01', PARIS, { limit: 2 });
    expect(list.map((s) => s.slice(0, 10))).toEqual(['2096-02-29', '2104-02-29']);
  });

  it('counts ordinal weekdays inside the year without BYMONTH', () => {
    const list = expand('FREQ=YEARLY;BYDAY=-1MO', '2026-01-01', PARIS, { limit: 2 });
    expect(list.map((s) => s.slice(0, 10))).toEqual(['2026-12-28', '2027-12-27']);
  });

  it('takes the time, weekday and day of month from DTSTART when unspecified', () => {
    expect(expand('FREQ=WEEKLY;COUNT=2', '2026-11-04 14:15', PARIS)).toEqual([
      '2026-11-04 14:15',
      '2026-11-11 14:15',
    ]);
    expect(expand('FREQ=YEARLY;COUNT=2', '2026-11-04 14:15', PARIS)).toEqual([
      '2026-11-04 14:15',
      '2027-11-04 14:15',
    ]);
  });
});

group('occurrences — bounds, count and until', () => {
  const rule = rrule('FREQ=DAILY;INTERVAL=3;BYHOUR=7;BYMINUTE=0');
  const dtstart = at('2026-01-01', PARIS);

  it('keeps the interval phase of DTSTART when the window starts later', () => {
    const list = occurrences(rule, {
      from: at('2026-02-01', PARIS),
      to: at('2026-02-08', PARIS),
      timeZone: PARIS,
      dtstart,
    });
    // Day offsets from 1 January that are multiples of 3: 33 (3 February) and 36 (6 February).
    expect(locals(list, PARIS)).toEqual(['2026-02-03 07:00', '2026-02-06 07:00']);
  });

  it('treats `from` as inclusive and `to` as exclusive', () => {
    const list = occurrences(rule, {
      from: at('2026-01-04 07:00', PARIS),
      to: at('2026-01-07 07:00', PARIS),
      timeZone: PARIS,
      dtstart,
    });
    expect(locals(list, PARIS)).toEqual(['2026-01-04 07:00']);
  });

  it('counts COUNT from DTSTART even when the window starts later', () => {
    const counted = rrule('FREQ=DAILY;COUNT=5');
    const list = occurrences(counted, {
      from: at('2026-01-04', PARIS),
      to: Infinity,
      timeZone: PARIS,
      dtstart,
    });
    expect(locals(list, PARIS)).toEqual(['2026-01-04 00:00', '2026-01-05 00:00']);
  });

  it('includes the whole UNTIL day for a local date', () => {
    expect(expand('FREQ=DAILY;UNTIL=20260103', '2026-01-01 23:00', PARIS)).toEqual([
      '2026-01-01 23:00',
      '2026-01-02 23:00',
      '2026-01-03 23:00',
    ]);
  });

  it('resolves a year-less UNTIL to the next such date', () => {
    const list = occurrences(
      {
        syntax: 'literal',
        freq: 'monthly',
        interval: 1,
        wkst: 1,
        until: { kind: 'local', month: 2, day: 15 },
      },
      { from: at('2026-11-15', PARIS), to: Infinity, timeZone: PARIS },
    );
    expect(locals(list, PARIS)).toEqual([
      '2026-11-15 00:00',
      '2026-12-15 00:00',
      '2027-01-15 00:00',
      '2027-02-15 00:00',
    ]);
  });

  it('honours `limit` and an empty window', () => {
    expect(expand('FREQ=MINUTELY', '2026-01-01', PARIS, { limit: 3 })).toHaveLength(3);
    expect(occurrences(rule, { from: dtstart, to: dtstart, timeZone: PARIS, dtstart })).toEqual([]);
    expect(occurrences(rule, { from: dtstart, to: Infinity, timeZone: PARIS, limit: 0 })).toEqual(
      [],
    );
  });

  it('ignores candidates before DTSTART', () => {
    expect(expand('FREQ=MONTHLY;BYMONTHDAY=1,20', '2026-01-10', PARIS, { limit: 2 })).toEqual([
      '2026-01-20 00:00',
      '2026-02-01 00:00',
    ]);
  });
});

group('occurrences — holidays', () => {
  // French public holidays in May 2026: 1 (Fri), 8 (Fri), 14 (Ascension, Thu), 25 (Whit Monday).
  const may2026 = ['2026-05-01', '2026-05-08', '2026-05-14', '2026-05-25'];
  const workingDay = (pos: number): RecurrenceRule => ({
    syntax: 'literal',
    freq: 'monthly',
    interval: 1,
    wkst: 1,
    byDay: [1, 2, 3, 4, 5].map((d) => ({ weekday: d as 1 })),
    bySetPos: [pos],
    excludeHolidays: true,
  });

  it('drops holidays before applying BYSETPOS', () => {
    const opts = { from: at('2026-05-01', PARIS), to: at('2026-06-01', PARIS), timeZone: PARIS };
    expect(locals(occurrences(workingDay(1), { ...opts, holidays: may2026 }), PARIS)).toEqual([
      '2026-05-04 00:00',
    ]);
    expect(locals(occurrences(workingDay(-1), { ...opts, holidays: may2026 }), PARIS)).toEqual([
      '2026-05-29 00:00',
    ]);
    expect(locals(occurrences(workingDay(1), opts), PARIS)).toEqual(['2026-05-01 00:00']);
  });

  it('counts the third working Tuesday around a Tuesday holiday', () => {
    const rule: RecurrenceRule = {
      ...workingDay(3),
      byDay: [{ weekday: 2 }],
    };
    const list = occurrences(rule, {
      from: at('2025-11-01', PARIS),
      to: at('2025-12-01', PARIS),
      timeZone: PARIS,
      holidays: ['2025-11-11'],
    });
    expect(locals(list, PARIS)).toEqual(['2025-11-25 00:00']);
  });

  it('rejects malformed holiday dates', () => {
    expect(() =>
      occurrences(workingDay(1), {
        from: 0,
        to: Infinity,
        timeZone: PARIS,
        holidays: ['2026-02-30'],
      }),
    ).toThrow(RangeError);
  });
});

group('occurrences — impossible rules terminate', () => {
  it.each([
    'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=30',
    'FREQ=MONTHLY;BYMONTH=4,6,9,11;BYMONTHDAY=31',
    'FREQ=DAILY;BYMONTH=2;BYMONTHDAY=31',
    'FREQ=MONTHLY;BYDAY=5MO;BYMONTH=2;BYMONTHDAY=1',
  ])('%s yields nothing', (text) => {
    const started = Date.now();
    expect(expand(text, '2026-01-01', PARIS)).toEqual([]);
    expect(next(rrule(text), at('2026-01-01', PARIS), { timeZone: PARIS })).toBeNull();
    expect(Date.now() - started).toBeLessThan(5_000);
  });
});

group('next', () => {
  const rule = rrule('FREQ=WEEKLY;BYDAY=MO,TH;BYHOUR=9;BYMINUTE=0');

  it('returns the first occurrence strictly after the given instant', () => {
    const monday = at('2026-11-02 09:00', PARIS);
    const after = next(rule, monday, { timeZone: PARIS });
    expect(after === null ? null : local(after, PARIS)).toBe('2026-11-05 09:00');
  });

  it('returns null once the series is over', () => {
    const counted = rrule('FREQ=DAILY;COUNT=2');
    const dtstart = at('2026-01-01', PARIS);
    expect(next(counted, at('2026-01-02', PARIS), { timeZone: PARIS, dtstart })).toBeNull();
  });
});

group('occurrences — invariants over generated rules', () => {
  /** Small deterministic PRNG (mulberry32) so failures are reproducible. */
  function prng(seed: number): () => number {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
  }
  const random = prng(2_026);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;
  const parts = [
    '',
    ';BYDAY=MO,FR',
    ';BYDAY=-1SU',
    ';BYMONTHDAY=1,-1',
    ';BYMONTH=2,3,10;BYMONTHDAY=29',
    ';BYDAY=MO,TU,WE,TH,FR;BYSETPOS=1',
    ';BYHOUR=2,14;BYMINUTE=30',
  ];
  const freqs = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
  const cases = Array.from({ length: 40 }, () => {
    let text = `FREQ=${pick(freqs)};INTERVAL=${1 + Math.floor(random() * 3)}${pick(parts)}`;
    if (text.includes('BYSETPOS') && !/MONTHLY|YEARLY/.test(text))
      text = text.replace(/;BYSETPOS=1/, '');
    if (/WEEKLY|DAILY/.test(text)) text = text.replace(/;BYDAY=-1SU/, ';BYDAY=SU');
    return [text, pick([PARIS, NEW_YORK])] as const;
  });

  it.each(cases)('%s in %s: ascending, in range, consistent with next()', (text, tz) => {
    const rule = rrule(text);
    const dtstart = at('2026-01-15 10:00', tz);
    const window = { from: at('2026-03-01', tz), to: at('2027-12-01', tz) };
    const list = occurrences(rule, { ...window, timeZone: tz, dtstart, limit: 60 });
    for (let i = 0; i < list.length; i++) {
      const ts = list[i] as number;
      expect(ts).toBeGreaterThanOrEqual(window.from);
      expect(ts).toBeLessThan(window.to);
      if (i > 0) expect(ts).toBeGreaterThan(list[i - 1] as number);
      if (i + 1 < list.length) expect(next(rule, ts, { timeZone: tz, dtstart })).toBe(list[i + 1]);
    }
  });
});
