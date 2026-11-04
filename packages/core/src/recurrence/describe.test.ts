import { describe as group, expect, it } from 'vitest';
import { describe } from './describe.ts';
import { parseCron } from './cron.ts';
import { parseLiteral } from './literal.ts';
import { parseRRule } from './rrule.ts';
import type { RecurrenceRule } from './types.ts';

function rule(text: string): RecurrenceRule {
  const parsed = parseRRule(text) ?? parseCron(text) ?? parseLiteral(text);
  if (!parsed) throw new Error(`Unparsed: ${text}`);
  return parsed;
}

group('describe', () => {
  it.each<[string, string, string]>([
    ['tous les jours', 'tous les jours', 'every day'],
    ['tous les 2 jours', 'un jour sur deux', 'every other day'],
    ['tous les 5 jours', 'tous les 5 jours', 'every 5 days'],
    ['chaque lundi', 'chaque lundi', 'every Monday'],
    [
      'lundi, mercredi et vendredi',
      'chaque lundi, mercredi et vendredi',
      'every Monday, Wednesday and Friday',
    ],
    ['un mardi sur deux', 'un mardi sur deux', 'every other Tuesday'],
    [
      'every other week on mon, wed',
      'toutes les deux semaines, le lundi et le mercredi',
      'every other week on Monday and Wednesday',
    ],
    ['les jours ouvrés', 'les jours ouvrés', 'every business day'],
    ['every weekday', 'du lundi au vendredi', 'every weekday'],
    ['le week-end', 'chaque week-end', 'every weekend'],
    ['le 15 de chaque mois', 'le 15 de chaque mois', 'every month on the 15th'],
    [
      'le 1er et le 15 du mois',
      'le 1er et le 15 de chaque mois',
      'every month on the 1st and the 15th',
    ],
    ['le dernier jour du mois', 'le dernier jour de chaque mois', 'every month on the last day'],
    [
      'le dernier vendredi du mois',
      'le dernier vendredi de chaque mois',
      'every month on the last Friday',
    ],
    [
      'le 3ème mardi ouvré de chaque mois',
      'le 3e mardi ouvré de chaque mois',
      'every month on the third business Tuesday',
    ],
    [
      'le 2e jour ouvré du mois',
      'le 2e jour ouvré de chaque mois',
      'every month on the second business day',
    ],
    ['every 3 months on the 1st', 'tous les 3 mois, le 1er', 'every 3 months on the 1st'],
    ['chaque année le 1er mars', 'chaque année le 1er mars', 'every year on March 1'],
    [
      'le dernier dimanche de mars',
      'chaque année le dernier dimanche de mars',
      'every year on the last Sunday of March',
    ],
    ['toutes les 2 heures', 'toutes les deux heures', 'every other hour'],
    ['toutes les 15 minutes', 'toutes les 15 minutes', 'every 15 minutes'],
  ])('%s', (text, fr, en) => {
    expect(describe(rule(text), 'fr')).toBe(fr);
    expect(describe(rule(text), 'en')).toBe(en);
  });

  it('adds times and end clauses', () => {
    const r = rule("tous les lundis à 9h30 jusqu'au 31 décembre 2026");
    expect(describe(r, 'fr')).toBe(
      'chaque lundi à 9 h 30, jusqu’au 31 décembre 2026'.replace('’', "'"),
    );
    expect(describe(r, 'en')).toBe('every Monday at 9:30 AM, until December 31, 2026');
    const counted = rule('every day at 6pm for 10 times');
    expect(describe(counted, 'fr')).toBe('tous les jours à 18 h, 10 fois');
    expect(describe(counted, 'en')).toBe('every day at 6:00 PM, 10 times');
    expect(describe(rule('FREQ=DAILY;COUNT=1'), 'en')).toBe('every day, once');
  });

  it('shows an absolute UNTIL in the requested zone', () => {
    const r = rule('FREQ=DAILY;UNTIL=20261231T230000Z');
    expect(describe(r, 'fr', { timeZone: 'Europe/Paris' })).toBe(
      "tous les jours, jusqu'au 1er janvier 2027 à 0 h",
    );
    expect(describe(r, 'en')).toBe('every day, until December 31, 2026 at 11:00 PM');
  });

  it('describes cron rules, including OR day matching and many times a day', () => {
    expect(describe(rule('0 9 1 * 1'), 'fr')).toBe('le 1er ou le lundi de chaque mois à 9 h');
    expect(describe(rule('0 9 1 * 1'), 'en')).toBe(
      'every month on the 1st or on Monday at 9:00 AM',
    );
    expect(describe(rule('*/15 9-17 * * 1-5'), 'en')).toBe('every weekday 36 times a day');
    expect(describe(rule('15 * * * *'), 'fr')).toBe('toutes les heures à la minute 15');
    expect(describe(rule('0,30 * * * *'), 'en')).toBe('every hour at minutes 0 and 30');
  });

  it('defaults to French', () => {
    expect(describe(rule('FREQ=WEEKLY;INTERVAL=3'))).toBe('toutes les 3 semaines');
  });
});
