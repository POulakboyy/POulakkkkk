import { describe as group, expect, it } from 'vitest';
import { occurrences } from './expand.ts';
import { at, locals, NEW_YORK, PARIS } from './fixtures.test-utils.ts';
import { parseLiteral } from './literal.ts';
import type { RecurrenceRule, WeekdayRef } from './types.ts';

const MON_FRI: WeekdayRef[] = ([1, 2, 3, 4, 5] as const).map((weekday) => ({ weekday }));

function parse(text: string, locale?: 'fr' | 'en'): RecurrenceRule {
  const rule = parseLiteral(text, locale ? { locale } : {});
  if (!rule) throw new Error(`Unparsed: ${text}`);
  return rule;
}

group('parseLiteral — French', () => {
  it.each<[string, Partial<RecurrenceRule>]>([
    ['tous les jours', { freq: 'daily', interval: 1 }],
    ['Chaque jour', { freq: 'daily' }],
    ['chaque lundi', { freq: 'weekly', byDay: [{ weekday: 1 }] }],
    ['tous les lundis et jeudis', { freq: 'weekly', byDay: [{ weekday: 1 }, { weekday: 4 }] }],
    ['tous les 2 jours', { freq: 'daily', interval: 2 }],
    ['un jour sur trois', { freq: 'daily', interval: 3 }],
    ['un mardi sur deux', { freq: 'weekly', interval: 2, byDay: [{ weekday: 2 }] }],
    ['toutes les 3 semaines', { freq: 'weekly', interval: 3 }],
    ['tous les quinze jours', { freq: 'weekly', interval: 2 }],
    ['les jours ouvrés', { freq: 'weekly', byDay: MON_FRI, excludeHolidays: true }],
    ['tous les jours ouvrables', { freq: 'weekly', byDay: MON_FRI, excludeHolidays: true }],
    ['du lundi au vendredi', { freq: 'weekly', byDay: MON_FRI }],
    ['en semaine', { freq: 'weekly', byDay: MON_FRI }],
    ['le week-end', { freq: 'weekly', byDay: [{ weekday: 6 }, { weekday: 0 }] }],
    ['le 15 de chaque mois', { freq: 'monthly', byMonthDay: [15] }],
    ['le 1er et le 15 du mois', { freq: 'monthly', byMonthDay: [1, 15] }],
    ['le dernier jour du mois', { freq: 'monthly', byMonthDay: [-1] }],
    ["l'avant-dernier jour du mois", { freq: 'monthly', byMonthDay: [-2] }],
    ['le dernier vendredi du mois', { freq: 'monthly', byDay: [{ weekday: 5, nth: -1 }] }],
    ['le premier lundi de chaque mois', { freq: 'monthly', byDay: [{ weekday: 1, nth: 1 }] }],
    [
      'le 1er et le 3e mercredi du mois',
      {
        freq: 'monthly',
        byDay: [
          { weekday: 3, nth: 1 },
          { weekday: 3, nth: 3 },
        ],
      },
    ],
    [
      'le 3ème mardi ouvré de chaque mois',
      { freq: 'monthly', byDay: [{ weekday: 2 }], bySetPos: [3], excludeHolidays: true },
    ],
    [
      'le 2e jour ouvré du mois',
      { freq: 'monthly', byDay: MON_FRI, bySetPos: [2], excludeHolidays: true },
    ],
    [
      'le dernier jour ouvré du mois',
      { freq: 'monthly', byDay: MON_FRI, bySetPos: [-1], excludeHolidays: true },
    ],
    ['chaque année le 1er mars', { freq: 'yearly', byMonth: [3], byMonthDay: [1] }],
    ['le 14 juillet', { freq: 'yearly', byMonth: [7], byMonthDay: [14] }],
    ['tous les ans le 25 décembre', { freq: 'yearly', byMonth: [12], byMonthDay: [25] }],
    [
      'le dernier dimanche de mars',
      { freq: 'yearly', byMonth: [3], byDay: [{ weekday: 0, nth: -1 }] },
    ],
    ['tous les 3 mois', { freq: 'monthly', interval: 3 }],
    ['tous les 2 ans', { freq: 'yearly', interval: 2 }],
    ['toutes les heures', { freq: 'hourly' }],
    ['toutes les 2 heures', { freq: 'hourly', interval: 2 }],
    ['toutes les 15 minutes', { freq: 'minutely', interval: 15 }],
    ['tous les jours en août', { freq: 'daily', byMonth: [8] }],
  ])('%s', (text, expected) => {
    expect(parse(text)).toMatchObject({ syntax: 'literal', ...expected });
  });

  it.each<[string, number, number]>([
    ['tous les jours à 9h', 9, 0],
    ['tous les jours à 9h30', 9, 30],
    ['tous les jours à 9 h 30', 9, 30],
    ['tous les jours à 14:15', 14, 15],
    ['tous les jours à 7 heures', 7, 0],
    ['tous les jours à midi', 12, 0],
    ['tous les jours à minuit', 0, 0],
  ])('time in %s', (text, hour, minute) => {
    expect(parse(text)).toMatchObject({ byHour: [hour], byMinute: [minute] });
  });

  it('several times sharing their minute or their hour', () => {
    expect(parse('chaque lundi à 9h et 18h')).toMatchObject({ byHour: [9, 18], byMinute: [0] });
    expect(parse('tous les jours à 9h et 9h30')).toMatchObject({ byHour: [9], byMinute: [0, 30] });
  });

  it('end clauses', () => {
    expect(parse("tous les lundis jusqu'au 31 décembre").until).toEqual({
      kind: 'local',
      month: 12,
      day: 31,
    });
    expect(parse("tous les jours jusqu'au 1er mars 2027").until).toEqual({
      kind: 'local',
      year: 2027,
      month: 3,
      day: 1,
    });
    expect(parse("tous les jours jusqu'au 03/04/2027").until).toMatchObject({ month: 4, day: 3 });
    expect(parse("tous les jours jusqu'au 2027-04-03").until).toMatchObject({ month: 4, day: 3 });
    expect(parse('tous les jours à 8h, 10 fois')).toMatchObject({ count: 10, byHour: [8] });
    expect(parse('chaque mardi pendant 5 fois').count).toBe(5);
  });
});

group('parseLiteral — English', () => {
  it.each<[string, Partial<RecurrenceRule>]>([
    ['daily', { freq: 'daily' }],
    ['every day', { freq: 'daily' }],
    ['every other day', { freq: 'daily', interval: 2 }],
    ['every Monday', { freq: 'weekly', byDay: [{ weekday: 1 }] }],
    ['on mondays and fridays', { freq: 'weekly', byDay: [{ weekday: 1 }, { weekday: 5 }] }],
    ['every other Tuesday', { freq: 'weekly', interval: 2, byDay: [{ weekday: 2 }] }],
    [
      'every other week on mon, wed',
      { freq: 'weekly', interval: 2, byDay: [{ weekday: 1 }, { weekday: 3 }] },
    ],
    ['every weekday', { freq: 'weekly', byDay: MON_FRI }],
    ['mon-fri', { freq: 'weekly', byDay: MON_FRI }],
    ['monday through friday', { freq: 'weekly', byDay: MON_FRI }],
    ['every business day', { freq: 'weekly', byDay: MON_FRI, excludeHolidays: true }],
    ['every weekend', { freq: 'weekly', byDay: [{ weekday: 6 }, { weekday: 0 }] }],
    ['every 3 months on the 1st', { freq: 'monthly', interval: 3, byMonthDay: [1] }],
    ['on the 15th of every month', { freq: 'monthly', byMonthDay: [15] }],
    ['the last day of the month', { freq: 'monthly', byMonthDay: [-1] }],
    ['the last friday of the month', { freq: 'monthly', byDay: [{ weekday: 5, nth: -1 }] }],
    ['the second Tuesday of each month', { freq: 'monthly', byDay: [{ weekday: 2, nth: 2 }] }],
    [
      'the 2nd business day of the month',
      { freq: 'monthly', byDay: MON_FRI, bySetPos: [2], excludeHolidays: true },
    ],
    [
      'the third working tuesday of each month',
      { freq: 'monthly', byDay: [{ weekday: 2 }], bySetPos: [3], excludeHolidays: true },
    ],
    ['every year on March 1', { freq: 'yearly', byMonth: [3], byMonthDay: [1] }],
    ['every year on the 1st of march', { freq: 'yearly', byMonth: [3], byMonthDay: [1] }],
    ['annually on Dec 25th', { freq: 'yearly', byMonth: [12], byMonthDay: [25] }],
    ['every 2 weeks', { freq: 'weekly', interval: 2 }],
    ['hourly', { freq: 'hourly' }],
    ['every 30 minutes', { freq: 'minutely', interval: 30 }],
  ])('%s', (text, expected) => {
    expect(parse(text)).toMatchObject({ syntax: 'literal', ...expected });
  });

  it.each<[string, number, number]>([
    ['every day at 9am', 9, 0],
    ['every day at 9:30 pm', 21, 30],
    ['every day at 12am', 0, 0],
    ['every day at 12 pm', 12, 0],
    ['every day at noon', 12, 0],
    ['every day at 17:45', 17, 45],
  ])('time in %s', (text, hour, minute) => {
    expect(parse(text)).toMatchObject({ byHour: [hour], byMinute: [minute] });
  });

  it('end clauses', () => {
    expect(parse('every monday until Dec 31').until).toEqual({ kind: 'local', month: 12, day: 31 });
    expect(parse('every monday until December 31st, 2027').until).toEqual({
      kind: 'local',
      year: 2027,
      month: 12,
      day: 31,
    });
    expect(parse('every day until 03/04/2027').until).toMatchObject({ month: 3, day: 4 });
    expect(parse('every day until 03/04/2027', 'fr').until).toMatchObject({ month: 4, day: 3 });
    expect(parse('every day for 10 times').count).toBe(10);
    expect(parse('daily, 3 times').count).toBe(3);
  });
});

group('parseLiteral — rejects what it does not fully understand', () => {
  it.each([
    '',
    'bonjour',
    'chaque lundi blabla',
    'every day except tuesdays',
    'à 9h',
    'tous les jours le 15',
    'chaque semaine le dernier vendredi',
    'tous les mois le 1er mars',
    'chaque année le 15',
    'le 32 de chaque mois',
    'le 6e lundi du mois',
    'tous les jours à 25h',
    'every day at 13pm',
    'tous les jours à 9h30 et 14h',
    'tous les jours 10 fois jusqu au 31 décembre',
    "jusqu'au 31 février",
    'le 3e mardi ouvré et le 2e jeudi ouvré du mois',
    'tous les jours chaque mois',
    'toutes les heures à 9h',
    'every 0 days',
  ])('%s', (text) => {
    expect(parseLiteral(text)).toBeNull();
  });
});

group('parseLiteral — end to end', () => {
  it('le 3ème mardi ouvré de chaque mois, around 11 November 2025', () => {
    const rule = parse('le 3ème mardi ouvré de chaque mois à 10h');
    const list = occurrences(rule, {
      from: at('2025-10-01', PARIS),
      to: at('2026-01-01', PARIS),
      timeZone: PARIS,
      holidays: ['2025-11-11'],
    });
    expect(locals(list, PARIS)).toEqual([
      '2025-10-21 10:00',
      '2025-11-25 10:00',
      '2025-12-16 10:00',
    ]);
  });

  it('le 2e jour ouvré du mois, with the May 2026 French holidays', () => {
    const rule = parse('le 2e jour ouvré du mois à 9h');
    const list = occurrences(rule, {
      from: at('2026-05-01', PARIS),
      to: at('2026-07-01', PARIS),
      timeZone: PARIS,
      holidays: ['2026-05-01', '2026-05-08', '2026-05-14', '2026-05-25'],
    });
    expect(locals(list, PARIS)).toEqual(['2026-05-05 09:00', '2026-06-02 09:00']);
  });

  it('les jours ouvrés skip holidays, every weekday does not', () => {
    const opts = {
      from: at('2026-07-13', PARIS),
      to: at('2026-07-16', PARIS),
      timeZone: PARIS,
      holidays: ['2026-07-14'],
    };
    expect(locals(occurrences(parse('les jours ouvrés à 9h'), opts), PARIS)).toEqual([
      '2026-07-13 09:00',
      '2026-07-15 09:00',
    ]);
    expect(occurrences(parse('every weekday at 9am'), opts)).toHaveLength(3);
  });

  it('un mardi sur deux keeps its phase from the series start', () => {
    const rule = parse('un mardi sur deux à 18h');
    const list = occurrences(rule, {
      from: at('2026-11-03', NEW_YORK),
      to: at('2026-12-01', NEW_YORK),
      timeZone: NEW_YORK,
      dtstart: at('2026-11-03', NEW_YORK),
    });
    expect(locals(list, NEW_YORK)).toEqual(['2026-11-03 18:00', '2026-11-17 18:00']);
  });

  it('a year-less until stops at the next 31 December', () => {
    const rule = parse("le 1er de chaque mois jusqu'au 31 décembre");
    const list = occurrences(rule, {
      from: at('2026-10-01', PARIS),
      to: Infinity,
      timeZone: PARIS,
    });
    expect(locals(list, PARIS)).toEqual([
      '2026-10-01 00:00',
      '2026-11-01 00:00',
      '2026-12-01 00:00',
    ]);
  });
});
