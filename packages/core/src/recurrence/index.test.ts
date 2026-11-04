import { describe as group, expect, it } from 'vitest';
import { recurrence } from '../index.ts';
import { at, locals, PARIS } from './fixtures.test-utils.ts';

group('recurrence public API', () => {
  it('auto-detects the syntax', () => {
    expect(recurrence.parseRule('RRULE:FREQ=DAILY')?.syntax).toBe('rrule');
    expect(recurrence.parseRule('freq=weekly;byday=mo')?.syntax).toBe('rrule');
    expect(recurrence.parseRule('0 9 * * 1-5')?.syntax).toBe('cron');
    expect(recurrence.parseRule('@monthly')?.syntax).toBe('cron');
    expect(recurrence.parseRule('tous les lundis à 9h')?.syntax).toBe('literal');
    expect(recurrence.parseRule('every monday at 9am')?.syntax).toBe('literal');
  });

  it('returns null for empty or unknown text, and for invalid RRULEs', () => {
    expect(recurrence.parseRule('   ')).toBeNull();
    expect(recurrence.parseRule('n importe quoi')).toBeNull();
    expect(recurrence.parseRule('FREQ=FORTNIGHTLY')).toBeNull();
  });

  it('passes the locale to the literal parser', () => {
    const fr = recurrence.parseRule('every day until 03/04/2027', { locale: 'fr' });
    expect(fr?.until).toMatchObject({ month: 4, day: 3 });
  });

  it('the three syntaxes of one rule expand identically', () => {
    const texts = ['tous les lundis à 9h', '0 9 * * 1', 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0'];
    const opts = { from: at('2026-03-01', PARIS), to: at('2026-04-15', PARIS), timeZone: PARIS };
    const [first, ...rest] = texts.map((t) => {
      const rule = recurrence.parseRule(t);
      if (!rule) throw new Error(t);
      return locals(recurrence.occurrences(rule, opts), PARIS);
    });
    expect(first).toHaveLength(7);
    for (const other of rest) expect(other).toEqual(first);
  });

  it('literal rules round-trip through RRULE when RFC 5545 can express them', () => {
    const rule = recurrence.parseRule('le dernier vendredi du mois à 17h');
    if (!rule) throw new Error('unparsed');
    const text = recurrence.toRRule(rule);
    expect(text).toBe('FREQ=MONTHLY;BYDAY=-1FR;BYHOUR=17;BYMINUTE=0');
    expect(recurrence.parseRule(text ?? '')).toMatchObject({ ...rule, syntax: 'rrule' });
    expect(recurrence.describe(rule, 'en')).toBe('every month on the last Friday at 5:00 PM');
  });
});
