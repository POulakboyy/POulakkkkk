import { describe as group, expect, it } from 'vitest';
import { parseCron } from './cron.ts';
import { occurrences } from './expand.ts';
import { at, locals, NEW_YORK, PARIS } from './fixtures.test-utils.ts';

function expand(expr: string, from: string, to: string, tz = PARIS): string[] {
  const rule = parseCron(expr);
  if (!rule) throw new Error(`Unparseable cron ${expr}`);
  return locals(occurrences(rule, { from: at(from, tz), to: at(to, tz), timeZone: tz }), tz);
}

group('parseCron — rule shape', () => {
  it('maps fields to the AST', () => {
    expect(parseCron('30 9 * * 1-5')).toEqual({
      syntax: 'cron',
      freq: 'weekly',
      interval: 1,
      wkst: 1,
      byDay: [1, 2, 3, 4, 5].map((weekday) => ({ weekday })),
      byHour: [9],
      byMinute: [30],
    });
    expect(parseCron('0 8 1,15 * *')).toMatchObject({
      freq: 'monthly',
      byMonthDay: [1, 15],
    });
    expect(parseCron('*/20 * * * *')).toMatchObject({ freq: 'hourly', byMinute: [0, 20, 40] });
    expect(parseCron('* 9 * * *')).toMatchObject({ freq: 'minutely', byHour: [9] });
    expect(parseCron('0 0 1 jan *')).toMatchObject({ freq: 'monthly', byMonth: [1] });
  });

  it('understands names, ranges with steps, 7 as Sunday and macros', () => {
    expect(parseCron('0 9 * * MON-FRI')?.byDay).toHaveLength(5);
    expect(parseCron('0 9 * * 7')?.byDay).toEqual([{ weekday: 0 }]);
    expect(parseCron('0 9 * * 0,7')?.byDay).toEqual([{ weekday: 0 }]);
    expect(parseCron('10-50/20 * * * *')?.byMinute).toEqual([10, 30, 50]);
    expect(parseCron('5/20 * * * *')?.byMinute).toEqual([5, 25, 45]);
    expect(parseCron('0 0 * jun-aug *')?.byMonth).toEqual([6, 7, 8]);
    expect(parseCron('@daily')).toMatchObject({ freq: 'daily', byHour: [0], byMinute: [0] });
    expect(parseCron('@hourly')).toMatchObject({ freq: 'hourly', byMinute: [0] });
    expect(parseCron('@weekly')?.byDay).toEqual([{ weekday: 0 }]);
  });

  it('understands L and # ordinals', () => {
    expect(parseCron('0 9 L * *')?.byMonthDay).toEqual([-1]);
    expect(parseCron('0 9 1,L * *')?.byMonthDay).toEqual([-1, 1]);
    expect(parseCron('0 9 * * 5L')).toMatchObject({
      freq: 'monthly',
      byDay: [{ weekday: 5, nth: -1 }],
    });
    expect(parseCron('0 9 * * TUE#3')?.byDay).toEqual([{ weekday: 2, nth: 3 }]);
  });

  it.each([
    '60 * * * *',
    '* 24 * * *',
    '0 0 0 * *',
    '0 0 32 * *',
    '0 0 * 13 *',
    '0 0 * * 8',
    '5-1 * * * *',
    '*/0 * * * *',
    '0 0 * * MON#6',
    '0 0 * FOO *',
    '* * * *',
    '* * * * * *',
    'tous les jours à 9h',
    '@reboot',
    '0 0 * * L',
  ])('rejects %s', (expr) => {
    expect(parseCron(expr)).toBeNull();
  });
});

group('parseCron — expansion', () => {
  it('every 15 minutes during office hours on weekdays', () => {
    const list = expand('*/15 9-17 * * 1-5', '2026-11-06', '2026-11-10');
    // Friday + Monday, 9 hours × 4 quarter hours each.
    expect(list).toHaveLength(72);
    expect(list[0]).toBe('2026-11-06 09:00');
    expect(list.at(-1)).toBe('2026-11-09 17:45');
  });

  it('matches either day field when both are restricted (Vixie cron)', () => {
    const list = expand('0 9 1 * 1', '2026-06-01', '2026-06-16');
    expect(list).toEqual(['2026-06-01 09:00', '2026-06-08 09:00', '2026-06-15 09:00']);
    const july = expand('0 9 1 * 1', '2026-07-01', '2026-07-08');
    expect(july).toEqual(['2026-07-01 09:00', '2026-07-06 09:00']);
  });

  it('29 February only in leap years', () => {
    const list = expand('0 0 29 2 *', '2026-01-01', '2033-01-01');
    expect(list).toEqual(['2028-02-29 00:00', '2032-02-29 00:00']);
  });

  it('last Friday and third Tuesday of the month', () => {
    expect(expand('0 9 * * 5L', '2026-02-01', '2026-04-01')).toEqual([
      '2026-02-27 09:00',
      '2026-03-27 09:00',
    ]);
    expect(expand('0 9 * * 2#3', '2026-11-01', '2026-12-01', NEW_YORK)).toEqual([
      '2026-11-17 09:00',
    ]);
  });

  it('keeps wall-clock times through DST', () => {
    expect(expand('0 9 * * *', '2026-03-28', '2026-03-31')).toEqual([
      '2026-03-28 09:00',
      '2026-03-29 09:00',
      '2026-03-30 09:00',
    ]);
  });

  it('does not depend on the series start time', () => {
    const rule = parseCron('30 7 * * *');
    if (!rule) throw new Error('unreachable');
    const list = occurrences(rule, {
      from: at('2026-01-01 12:34', PARIS),
      to: at('2026-01-03', PARIS),
      timeZone: PARIS,
    });
    expect(locals(list, PARIS)).toEqual(['2026-01-02 07:30']);
  });
});
