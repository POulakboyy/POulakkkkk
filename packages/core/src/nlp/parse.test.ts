import { describe, expect, it } from 'vitest';
import { fromZoned } from '../time.ts';
import { parse } from './index.ts';
import type { ParseContext } from './index.ts';

const TZ = 'Europe/Paris';
/** Fixed "now": Thursday 2026-10-08 10:00 in Paris (CEST, UTC+2). */
const NOW = fromZoned({ year: 2026, month: 10, day: 8, hour: 10 }, TZ);
const ctx: ParseContext = { now: NOW, timeZone: TZ };

/** Instant of a Paris wall-clock time. */
function paris(month: number, day: number, hour = 0, minute = 0, year = 2026): number {
  return fromZoned({ year, month, day, hour, minute }, TZ);
}

const p = (input: string, extra: Partial<ParseContext> = {}) => parse(input, { ...ctx, ...extra });

describe('reference example', () => {
  it('parses a meeting with a weekday, a time range and an attendee', () => {
    const r = p('Réunion projet X mardi prochain 14h-16h avec @paul');
    expect(r.kind).toBe('event');
    expect(r.title).toBe('Réunion projet X');
    expect(r.start).toBe(paris(10, 13, 14));
    expect(r.end).toBe(paris(10, 13, 16));
    expect(r.durationMin).toBe(120);
    expect(r.attendees).toEqual(['paul']);
    expect(r.allDay).toBeUndefined();
    expect(r.confidence).toBe(1);
  });

  it('returns character spans that slice back to the token text', () => {
    const input = 'Réunion projet X mardi prochain 14h-16h avec @paul';
    const r = p(input);
    expect(r.tokens.map((t) => [t.type, t.text])).toEqual([
      ['date', 'mardi prochain'],
      ['time', '14h-16h'],
      ['attendee', 'avec @paul'],
    ]);
    for (const t of r.tokens) expect(input.slice(t.start, t.end)).toBe(t.text);
    expect(r.tokens[0]?.value).toBe(paris(10, 13));
    expect(r.tokens[1]?.value).toBe(14 * 60);
    expect(r.tokens[2]?.value).toBe('paul');
  });
});

describe('relative days', () => {
  it.each([
    ["aujourd'hui", 10, 8],
    ['aujourd’hui', 10, 8],
    ['today', 10, 8],
    ['demain', 10, 9],
    ['tomorrow', 10, 9],
    ['après-demain', 10, 10],
    ['apres demain', 10, 10],
    ['the day after tomorrow', 10, 10],
  ])('%s', (word, month, day) => {
    const r = p(`Acheter du pain ${word}`);
    expect(r.kind).toBe('task');
    expect(r.title).toBe('Acheter du pain');
    expect(r.allDay).toBe(true);
    expect(r.start).toBe(paris(month, day));
  });

  it('keeps the part of the day of "ce soir" without inventing a time', () => {
    const r = p('Appeler maman ce soir');
    expect(r.start).toBe(paris(10, 8));
    expect(r.allDay).toBe(true);
    expect(r.partOfDay).toBe('evening');
    expect(r.title).toBe('Appeler maman');
  });

  it('reads a part of the day after a date ("demain matin", "friday evening")', () => {
    expect(p('Courir demain matin').partOfDay).toBe('morning');
    const r = p('Drinks friday evening');
    expect(r.start).toBe(paris(10, 9));
    expect(r.partOfDay).toBe('evening');
  });

  it('moves a morning-looking hour into the evening ("ce soir 8h", "demain soir 8h")', () => {
    expect(p('Dîner ce soir 8h').start).toBe(paris(10, 8, 20));
    expect(p('Dîner demain soir à 8h30').start).toBe(paris(10, 9, 20, 30));
    expect(p('Concert 9h du soir').start).toBe(paris(10, 8, 21));
  });
});

describe('weekdays', () => {
  it('bare weekday: next occurrence, today included', () => {
    expect(p('Yoga mardi').start).toBe(paris(10, 13));
    expect(p('Yoga jeudi').start).toBe(paris(10, 8));
    expect(p('Yoga friday').start).toBe(paris(10, 9));
    expect(p('Yoga ce vendredi').start).toBe(paris(10, 9));
    expect(p('Yoga this sunday').start).toBe(paris(10, 11));
  });

  it('"prochain"/"next": strictly after today', () => {
    expect(p('Yoga jeudi prochain').start).toBe(paris(10, 15));
    expect(p('Yoga next thursday').start).toBe(paris(10, 15));
    expect(p('Yoga next tuesday').start).toBe(paris(10, 13));
    expect(p('Yoga prochain lundi').start).toBe(paris(10, 12));
  });

  it('a bare weekday that is today moves a week on once its time has passed', () => {
    expect(p('Yoga jeudi 9h').start).toBe(paris(10, 15, 9));
    expect(p('Yoga jeudi 18h').start).toBe(paris(10, 8, 18));
  });

  it('a weekday with a day number uses the number and flags a mismatch', () => {
    const ok = p('Visio le mardi 13 à 10h');
    expect(ok.start).toBe(paris(10, 13, 10));
    expect(ok.confidence).toBe(1);
    const wrong = p('Visio mercredi 13');
    expect(wrong.start).toBe(paris(10, 13));
    expect(wrong.confidence).toBeLessThan(1);
  });
});

describe('calendar dates', () => {
  it('"le 12" is the next 12th, today included', () => {
    expect(p('Dentiste le 12').start).toBe(paris(10, 12));
    expect(p('Dentiste le 8').start).toBe(paris(10, 8));
    expect(p('Dentiste le 5').start).toBe(paris(11, 5));
  });

  it('day + month, with or without year, in both languages', () => {
    expect(p('Anniversaire le 12 mars').start).toBe(paris(3, 12, 0, 0, 2027));
    expect(p('Anniversaire 12 octobre').start).toBe(paris(10, 12));
    expect(p('Anniversaire 1er novembre').start).toBe(paris(11, 1));
    expect(p('Anniversaire le 12 mars 2025').start).toBe(paris(3, 12, 0, 0, 2025));
    expect(p('Birthday March 12').start).toBe(paris(3, 12, 0, 0, 2027));
    expect(p('Birthday Dec. 3rd, 2026').start).toBe(paris(12, 3));
    expect(p('Birthday 12 March').start).toBe(paris(3, 12, 0, 0, 2027));
    expect(p('Party on the 20th').start).toBe(paris(10, 20));
  });

  it('numeric dates follow the locale: d/m in French, m/d in English', () => {
    expect(p('Dentiste 12/03', { locale: 'fr' }).start).toBe(paris(3, 12, 0, 0, 2027));
    expect(p('Dentist 12/03', { locale: 'en' }).start).toBe(paris(12, 3));
    expect(p('Dentiste 25/12/2026').start).toBe(paris(12, 25));
    expect(p('Dentiste 25/12/27').start).toBe(paris(12, 25, 0, 0, 2027));
    expect(p('Dentiste 2026-11-02').start).toBe(paris(11, 2));
  });

  it('lowers confidence for an ambiguous numeric date when the locale is implicit', () => {
    expect(p('Dentiste 12/03').confidence).toBeLessThan(1);
    expect(p('Dentiste 12/03', { locale: 'fr' }).confidence).toBe(1);
    expect(p('Dentiste 25/12').confidence).toBe(1);
  });

  it('rejects impossible dates and fraction-looking numbers', () => {
    expect(p('Note 31/02').start).toBeUndefined();
    expect(p('Faire 3/4 du chapitre').title).toBe('Faire 3/4 du chapitre');
    expect(p('Inviter les 12 personnes').tokens).toEqual([]);
    expect(p('Buy 3 apples').tokens).toEqual([]);
  });

  it('waits for a leap year for 29 February', () => {
    expect(p('Fête le 29 février').start).toBe(paris(2, 29, 0, 0, 2028));
  });
});

describe('offsets and periods', () => {
  it.each([
    ['dans 3 jours', 10, 11],
    ['dans une semaine', 10, 15],
    ['dans 2 semaines', 10, 22],
    ['dans huit jours', 10, 15],
    ['dans quinze jours', 10, 22],
    ['dans 1 mois', 11, 8],
    ['in 2 weeks', 10, 22],
    ['in a week', 10, 15],
    ['in 3 days', 10, 11],
    ['3 days from now', 10, 11],
    ['in a fortnight', 10, 22],
  ])('%s', (phrase, month, day) => {
    expect(p(`Bilan ${phrase}`).start).toBe(paris(month, day));
  });

  it('"dans 2h" / "in 30 minutes" is an exact instant', () => {
    const r = p('Appeler maman dans 2h');
    expect(r.kind).toBe('event');
    expect(r.start).toBe(paris(10, 8, 12));
    expect(p('Stretch in 30 minutes').start).toBe(paris(10, 8, 10, 30));
  });

  it('week and month periods', () => {
    expect(p('Rapport la semaine prochaine').start).toBe(paris(10, 12));
    expect(p('Report next week').start).toBe(paris(10, 12));
    expect(p('Rapport fin de semaine').start).toBe(paris(10, 9));
    expect(p('Report end of the week').start).toBe(paris(10, 9));
    expect(p('Bilan fin du mois').start).toBe(paris(10, 31));
    expect(p('Bilan le mois prochain').start).toBe(paris(11, 1));
    expect(p('Rando ce week-end').start).toBe(paris(10, 10));
    expect(p('Hike this weekend').start).toBe(paris(10, 10));
  });

  it('"fin de semaine" on a Saturday is the coming Sunday', () => {
    const saturday = paris(10, 10, 9);
    expect(p('Rapport fin de semaine', { now: saturday }).start).toBe(paris(10, 11));
  });
});

describe('times', () => {
  it.each([
    ['14h', 14, 0],
    ['14h30', 14, 30],
    ['14 h 30', 14, 30],
    ['14:30', 14, 30],
    ['à 9h', 9, 0],
    ['2pm', 14, 0],
    ['2:30pm', 14, 30],
    ['11 am', 11, 0],
    ['12pm', 12, 0],
    ['12am', 0, 0],
    ['midi', 12, 0],
    ['noon', 12, 0],
    ['15 heures', 15, 0],
    ['à 2h', 2, 0],
  ])('%s', (time, h, m) => {
    const r = p(`Point demain ${time}`);
    expect(r.kind).toBe('event');
    expect(r.start).toBe(paris(10, 9, h, m));
    expect(r.end).toBe(paris(10, 9, h, m) + 60 * 60_000);
    expect(r.title).toBe('Point');
  });

  it('"minuit" is the end of the day', () => {
    expect(p('Envoyer aujourd’hui minuit').start).toBe(paris(10, 9));
  });

  it('a time without a date is today, or tomorrow once it has passed', () => {
    expect(p('Appel 16h').start).toBe(paris(10, 8, 16));
    expect(p('Appel 9h').start).toBe(paris(10, 9, 9));
  });

  it('"at 3" guesses the afternoon with a lower confidence', () => {
    const r = p('Meet Sam at 3');
    expect(r.start).toBe(paris(10, 8, 15));
    expect(r.confidence).toBeLessThan(1);
    expect(p('Meet Sam at 9').start).toBe(paris(10, 9, 9));
  });

  it('ignores invalid times', () => {
    expect(p('Appel 25h').start).toBeUndefined();
    expect(p('Appel 14:75').start).toBeUndefined();
  });
});

describe('time ranges and durations', () => {
  it.each([
    ['14h-16h', 14, 0, 16, 0],
    ['14h – 16h', 14, 0, 16, 0],
    ['de 14h à 16h', 14, 0, 16, 0],
    ['de 14h30 à 16', 14, 30, 16, 0],
    ['entre 9h et 10h30', 9, 0, 10, 30],
    ['14-16h', 14, 0, 16, 0],
    ['from 2 to 4pm', 14, 0, 16, 0],
    ['2-4pm', 14, 0, 16, 0],
    ['11-1pm', 11, 0, 13, 0],
    ['9am-5pm', 9, 0, 17, 0],
    ['between 10:00 and 11:15', 10, 0, 11, 15],
  ])('%s', (range, h1, m1, h2, m2) => {
    const r = p(`Atelier demain ${range}`);
    expect(r.start).toBe(paris(10, 9, h1, m1));
    expect(r.end).toBe(paris(10, 9, h2, m2));
    expect(r.title).toBe('Atelier');
  });

  it('a range ending before it starts ends the next day', () => {
    const r = p('Soirée demain 22h-1h');
    expect(r.end).toBe(paris(10, 10, 1));
    expect(r.durationMin).toBe(180);
  });

  it('"14h pendant 2h" sets the event length', () => {
    const r = p('Atelier 14h pendant 2h');
    expect(r.start).toBe(paris(10, 8, 14));
    expect(r.end).toBe(paris(10, 8, 16));
    expect(r.durationMin).toBe(120);
  });

  it.each([
    ['30min', 30],
    ['30 minutes', 30],
    ['2h', 120],
    ['1h30', 90],
    ['~45 min', 45],
    ['environ 1h', 60],
    ['1,5h', 90],
    ['1.5 hours', 90],
    ['2 heures', 120],
    ['une demi-heure', 30],
    ['half an hour', 30],
    ['un quart d’heure', 15],
    ['deux heures et demie', 150],
    ['pendant 6h', 360],
  ])('task estimate %s', (estimate, minutes) => {
    const r = p(`Écrire le chapitre ${estimate}`);
    expect(r.kind).toBe('task');
    expect(r.estimateMin).toBe(minutes);
    expect(r.durationMin).toBeUndefined();
    expect(r.title).toBe('Écrire le chapitre');
  });

  it('"Nh" is a duration for N ≤ 4 and a time for N ≥ 5', () => {
    expect(p('Lire 4h').estimateMin).toBe(240);
    expect(p('Lire 5h').start).toBe(paris(10, 9, 5));
  });

  it('after a late part of the day, "3h" is 15:00', () => {
    const r = p('Shooting vendredi après-midi 3h');
    expect(r.start).toBe(paris(10, 9, 15));
    expect(r.estimateMin).toBeUndefined();
  });

  it('a meeting duration without a start is kept as durationMin', () => {
    const r = p('Call 30 min');
    expect(r.kind).toBe('event');
    expect(r.start).toBeUndefined();
    expect(r.durationMin).toBe(30);
  });

  it('honours defaultEventMin', () => {
    const r = p('Rdv 15h', { defaultEventMin: 30 });
    expect(r.end).toBe(paris(10, 8, 15, 30));
  });
});

describe('deadlines', () => {
  it('"avant <jour>" is exclusive: midnight starting that day', () => {
    const r = p('Payer facture EDF avant vendredi');
    expect(r.kind).toBe('task');
    expect(r.title).toBe('Payer facture EDF');
    expect(r.deadline).toBe(paris(10, 9));
    expect(r.start).toBeUndefined();
  });

  it.each([
    ["d'ici le 12", paris(10, 13)],
    ['d’ici vendredi', paris(10, 10)],
    ['by friday', paris(10, 10)],
    ['due tomorrow', paris(10, 10)],
    ['pour lundi', paris(10, 13)],
    ['by the end of the week', paris(10, 10)],
    ["d'ici 3 jours", paris(10, 12)],
    ['au plus tard le 20 octobre', paris(10, 21)],
  ])('"%s" is inclusive: end of that day', (phrase, expected) => {
    const r = p(`Rendre le rapport ${phrase}`);
    expect(r.deadline).toBe(expected);
    expect(r.title).toBe('Rendre le rapport');
  });

  it('a deadline with a time is that exact instant', () => {
    expect(p('Envoyer devis avant 18h').deadline).toBe(paris(10, 8, 18));
    expect(p('Envoyer devis avant 9h').deadline).toBe(paris(10, 9, 9));
    expect(p('Send quote by friday at 5').deadline).toBe(paris(10, 9, 17));
    expect(p('Send quote due tomorrow 5pm').deadline).toBe(paris(10, 9, 17));
  });

  it('"pour 2h" stays a duration', () => {
    const r = p('Réviser pour 2h');
    expect(r.deadline).toBeUndefined();
    expect(r.estimateMin).toBe(120);
  });

  it('keeps a start date and a deadline apart', () => {
    const r = p('Commencer le dossier demain, à rendre pour vendredi');
    expect(r.start).toBe(paris(10, 9));
    expect(r.deadline).toBe(paris(10, 10));
  });
});

describe('recurrence', () => {
  it.each([
    'tous les mardis',
    'tous les jours',
    'toutes les semaines',
    'tous les 15 jours',
    'chaque lundi',
    'chaque mois',
    'une semaine sur deux',
    'le 1er de chaque mois',
    'every monday',
    'every other day',
    'every 2 weeks',
    'each morning',
    'daily',
    'weekly',
    'hebdo',
    'the 1st of every month',
    'on mondays and fridays',
  ])('keeps "%s" as source text', (phrase) => {
    const r = p(`Arroser les plantes ${phrase}`);
    expect(r.recurrence).toBe(phrase);
    expect(r.title).toBe('Arroser les plantes');
  });

  it('anchors the first occurrence on the named weekday', () => {
    const r = p('Stand-up tous les mardis à 9h');
    expect(r.kind).toBe('event');
    expect(r.start).toBe(paris(10, 13, 9));
    expect(r.recurrence).toBe('tous les mardis');
  });

  it('merges touching phrases and lists weekdays', () => {
    const r = p('Réunion hebdo tous les lundis et jeudis 10h');
    expect(r.recurrence).toBe('hebdo tous les lundis et jeudis');
    expect(r.title).toBe('Réunion');
    // Thursday 10:00 is now: the next occurrence is Monday.
    expect(r.start).toBe(paris(10, 12, 10));
  });

  it('expands "du lundi au vendredi" and skips a passed slot', () => {
    const r = p('Sport du lundi au vendredi 7h');
    expect(r.recurrence).toBe('du lundi au vendredi');
    expect(r.start).toBe(paris(10, 9, 7));
  });

  it('an explicit date wins over the recurrence anchor', () => {
    expect(p('Yoga every monday starting 2026-10-20').start).toBe(paris(10, 20));
  });
});

describe('kind', () => {
  it.each([
    'Réunion budget',
    'RDV dentiste',
    'rendez-vous banque',
    'Call fournisseur',
    'Meeting design',
    'Déjeuner avec Léa',
    'Appel client',
    'Lunch with Sam',
  ])('%s is an event', (input) => expect(p(input).kind).toBe('event'));

  it('attendees make an event unless an action verb opens the line', () => {
    expect(p('Brainstorm @lea').mode).toBe('create');
    expect(p('Brainstorm @lea').kind).toBe('task');
    expect(p('Café @lea').kind).toBe('event');
    expect(p('Relancer @paul').kind).toBe('task');
  });

  it('a date alone keeps a task; an all-day event spans the day', () => {
    expect(p('Acheter des fleurs demain').kind).toBe('task');
    const r = p('Séminaire demain');
    expect(r.kind).toBe('event');
    expect(r.allDay).toBe(true);
    expect(r.start).toBe(paris(10, 9));
    expect(r.end).toBe(paris(10, 10));
    expect(r.durationMin).toBeUndefined();
  });

  it('plain text is a task with nothing guessed', () => {
    const r = p('acheter du pain');
    expect(r).toEqual({
      kind: 'task',
      title: 'Acheter du pain',
      attendees: [],
      tags: [],
      tokens: [],
      confidence: 1,
    });
  });
});

describe('attendees, tags, priority', () => {
  it('collects every mention and strips their joiners', () => {
    const r = p('Sync avec @marie et @paul, @Zoé.');
    expect(r.attendees).toEqual(['marie', 'paul', 'Zoé']);
    expect(r.title).toBe('Sync');
  });

  it('ignores e-mail addresses', () => {
    expect(p('Écrire à jean@exemple.fr').attendees).toEqual([]);
  });

  it('collects tags, not "C#"', () => {
    const r = p('Lire doc #veille #client/acme C#');
    expect(r.tags).toEqual(['veille', 'client/acme']);
    expect(r.title).toBe('Lire doc C#');
  });

  it.each([
    ['Payer loyer !', 1],
    ['Payer loyer !!', 2],
    ['Payer loyer !!!', 3],
    ['Payer loyer p1', 3],
    ['Payer loyer p3', 1],
    ['Payer loyer urgent', 3],
    ['Payer loyer asap', 3],
    ['Pay rent high priority', 3],
    ['Important : payer le loyer', 2],
    ['Payer loyer, priorité basse', 1],
  ])('%s → %i', (input, level) => {
    const r = p(input);
    expect(r.priority).toBe(level);
    expect(r.title.toLowerCase()).toMatch(/^payer (le )?loyer$|^pay rent$/);
  });

  it('keeps "important" mid-sentence', () => {
    const r = p('Envoyer le document important à la banque');
    expect(r.priority).toBeUndefined();
    expect(r.title).toBe('Envoyer le document important à la banque');
  });

  it('keeps the highest priority', () => {
    expect(p('Fix bug ! asap').priority).toBe(3);
  });
});

describe('location (conservative)', () => {
  it.each([
    ['Dîner chez Marie demain', 'Marie', 'Dîner'],
    ['Contrôle chez le dentiste mardi', 'le dentiste', 'Contrôle'],
    ['Déjeuner à Lyon le 15', 'Lyon', 'Déjeuner'],
    ['Expo au Café de Flore', 'Café de Flore', 'Expo'],
    ['Coffee at Blue Bottle at 3pm', 'Blue Bottle', 'Coffee'],
  ])('%s', (input, location, title) => {
    const r = p(input);
    expect(r.location).toBe(location);
    expect(r.title).toBe(title);
    expect(r.confidence).toBeLessThan(1);
  });

  it.each([
    'Buy a Tesla',
    'Répondre à Jean',
    'Meet at Noon',
    'Rendez-vous à 14h',
    'Visit in Paris',
  ])('no location in "%s"', (input) => expect(p(input).location).toBeUndefined());
});

describe('work mode', () => {
  it.each([
    ['Écrire la newsletter', 'create'],
    ['Dessiner la couverture', 'create'],
    ['Composer le thème', 'create'],
    ['Tourner la vidéo', 'create'],
    ['Design the onboarding', 'create'],
    ['Payer les impôts', 'organize'],
    ['Répondre aux mails', 'organize'],
    ['Trier les photos', 'organize'],
    ['Organiser le grenier', 'organize'],
    ['Facturer le client', 'organize'],
    ['Invoice ACME', 'organize'],
  ])('%s → %s', (input, mode) => expect(p(input).mode).toBe(mode));

  it('leaves the mode unset when no verb is recognised', () => {
    expect(p('Réunion projet').mode).toBeUndefined();
  });
});

describe('title tidying', () => {
  it.each([
    ['Demain, réunion budget', 'Réunion budget'],
    ['réunion budget à 15h.', 'Réunion budget'],
    ['Lire la suite...', 'Lire la suite...'],
    ['Préparer slides pour — demain', 'Préparer slides'],
    ['Courses () demain', 'Courses'],
    ['12 œufs demain', '12 œufs'],
  ])('%s → %s', (input, title) => expect(p(input).title).toBe(title));

  it('halves the confidence when nothing is left for the title', () => {
    const r = p('demain 14h');
    expect(r.title).toBe('');
    expect(r.confidence).toBe(0.5);
  });

  it('handles empty input', () => {
    expect(p('')).toMatchObject({ kind: 'task', title: '', tokens: [] });
    expect(p('   ').title).toBe('');
  });
});

describe('time zones and DST', () => {
  const beforeFallBack = fromZoned({ year: 2026, month: 10, day: 24, hour: 10 }, TZ);
  const at = (input: string) => parse(input, { now: beforeFallBack, timeZone: TZ });

  it('keeps the wall-clock time across the end of summer time (25 Oct 2026)', () => {
    const r = at('Réunion demain 14h');
    expect(r.start).toBe(Date.UTC(2026, 9, 25, 13)); // 14:00 CET = 13:00 UTC
    const before = at('Réunion aujourd’hui 14h');
    expect(before.start).toBe(Date.UTC(2026, 9, 24, 12)); // 14:00 CEST = 12:00 UTC
  });

  it('measures durations in real minutes across the 25-hour day', () => {
    const r = at('Garde demain 0h-23h');
    expect(r.start).toBe(Date.UTC(2026, 9, 24, 22));
    expect(r.end).toBe(Date.UTC(2026, 9, 25, 22));
    expect(r.durationMin).toBe(24 * 60);
  });

  it('starts an all-day item at local midnight of a DST day', () => {
    const r = at('Ménage demain');
    expect(r.start).toBe(Date.UTC(2026, 9, 24, 22)); // midnight CEST
  });

  it('resolves "today" in the given zone, not UTC', () => {
    // 23:30 UTC on 8 Oct is already 9 Oct in Tokyo.
    const now = Date.UTC(2026, 9, 8, 23, 30);
    const r = parse('Courses demain', { now, timeZone: 'Asia/Tokyo' });
    expect(r.start).toBe(fromZoned({ year: 2026, month: 10, day: 10 }, 'Asia/Tokyo'));
  });
});

describe('robustness and speed', () => {
  it('never throws on odd input', () => {
    for (const s of [
      '@',
      '#',
      '!!!!',
      '@@paul',
      '#1',
      'le',
      'à',
      '14h-',
      'de 14h à',
      '–',
      '🙂 demain',
      'p0',
    ]) {
      expect(() => p(s)).not.toThrow();
    }
  });

  it('parses a typical line well under a millisecond on average', () => {
    const input = 'Réunion projet X mardi prochain 14h-16h avec @paul #travail !! à Lyon';
    for (let i = 0; i < 200; i++) p(input);
    const runs = 2000;
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) p(input);
    expect((performance.now() - t0) / runs).toBeLessThan(1);
  });

  it('stays linear on long adversarial input', () => {
    const input = `${'14h-14h- de de 1/1/ @@ ## !! tous les '.repeat(400)}x`;
    const t0 = performance.now();
    p(input);
    expect(performance.now() - t0).toBeLessThan(500);
  });
});
