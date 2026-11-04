import { describe, expect, it } from 'vitest';
import { fromZoned } from '../time.ts';
import { cleanTranscript, parse, splitActions } from './index.ts';

describe('cleanTranscript', () => {
  it.each([
    ['euh je veux appeler Paul', 'Je veux appeler Paul'],
    ['Euh, je veux, hum, appeler Paul', 'Je veux, appeler Paul'],
    ['euhhh bon ben je sais pas', 'Bon je sais pas'],
    ['heu hmm bah oui', 'Oui'],
    ['je je je veux', 'Je veux'],
    ['il faut il faut que je parte', 'Il faut que je parte'],
    ['nous nous voyons demain', 'Nous nous voyons demain'],
    ['Appeler Ben demain', 'Appeler Ben demain'],
  ])('fr: %s', (input, out) => expect(cleanTranscript(input, 'fr')).toBe(out));

  it.each([
    ['um I need to uh call Sam', 'I need to call Sam'],
    ['so, er, the the report', 'So, the report'],
    ['erm, I I think so', 'I think so'],
    ['she had had enough', 'She had had enough'],
  ])('en: %s', (input, out) => expect(cleanTranscript(input, 'en')).toBe(out));

  it('uses both filler lists without a locale', () => {
    expect(cleanTranscript('euh um demain')).toBe('Demain');
  });

  it('keeps "er" in French text where it is not a filler', () => {
    expect(cleanTranscript('le 1 er mai', 'fr')).toBe('Le 1 er mai');
  });

  it('handles empty input', () => {
    expect(cleanTranscript('')).toBe('');
    expect(cleanTranscript('euh')).toBe('');
  });
});

describe('splitActions', () => {
  it('splits on sentences and sequencing words', () => {
    expect(
      splitActions(
        "Euh il faut que j'appelle Paul demain, et puis acheter du pain et du lait. Ensuite écrire le chapitre 3",
        'fr',
      ),
    ).toEqual(['Appelle Paul demain', 'Acheter du pain et du lait', 'Écrire le chapitre 3']);
  });

  it('strips dictation lead-ins', () => {
    expect(
      splitActions(
        "N'oublie pas de payer le loyer. Je dois aussi répondre à Marc ; penser à arroser",
        'fr',
      ),
    ).toEqual(['Payer le loyer', 'Répondre à Marc', 'Arroser']);
  });

  it('splits English dictation', () => {
    expect(
      splitActions(
        'um I need to email Sam, and then book the flight. Also remind me to water plants',
        'en',
      ),
    ).toEqual(['Email Sam', 'Book the flight', 'Water plants']);
  });

  it('splits lines and bullets', () => {
    expect(splitActions('- acheter du pain\n- appeler Léa\n• ranger le bureau')).toEqual([
      'Acheter du pain',
      'Appeler Léa',
      'Ranger le bureau',
    ]);
  });

  it('does not split on a plain "et" or on decimals', () => {
    expect(splitActions('acheter du pain et du lait pour 1.5 euros')).toEqual([
      'Acheter du pain et du lait pour 1.5 euros',
    ]);
  });

  it('drops empty pieces', () => {
    expect(splitActions('... euh. ; ')).toEqual([]);
  });

  it('produces items the parser understands', () => {
    const now = fromZoned({ year: 2026, month: 10, day: 8, hour: 10 }, 'Europe/Paris');
    const items = splitActions(
      'réunion avec @paul demain 14h, ensuite payer la facture avant vendredi',
    );
    const parsed = items.map((s) => parse(s, { now, timeZone: 'Europe/Paris' }));
    expect(parsed.map((r) => [r.kind, r.title])).toEqual([
      ['event', 'Réunion'],
      ['task', 'Payer la facture'],
    ]);
  });
});
