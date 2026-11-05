import { describe, expect, it } from 'vitest';
import { formatMessage, MessageSyntaxError, messageVariables, parseMessage } from './message.ts';

describe('formatMessage', () => {
  it('returns plain text untouched', () => {
    expect(formatMessage('fr', 'Bonjour')).toBe('Bonjour');
  });

  it('substitutes simple arguments and keeps unknown ones visible', () => {
    expect(formatMessage('fr', 'Placée à {time}', { time: '14:30' })).toBe('Placée à 14:30');
    expect(formatMessage('fr', 'Placée à {time}')).toBe('Placée à {time}');
  });

  it('formats `number` arguments with the locale', () => {
    expect(formatMessage('en', '{max, number} characters', { max: 1200 })).toBe('1,200 characters');
    expect(formatMessage('fr', '{max, number} caractères', { max: 1200 })).toBe('1 200 caractères');
  });

  describe('plural', () => {
    const fr = '{count, plural, =0 {Aucune tâche} one {# tâche} other {# tâches}}';
    const en = '{count, plural, =0 {No tasks} one {# task} other {# tasks}}';

    it('prefers exact `=N` matches', () => {
      expect(formatMessage('fr', fr, { count: 0 })).toBe('Aucune tâche');
      expect(formatMessage('en', en, { count: 0 })).toBe('No tasks');
    });

    it('uses the French rule: 0 and 1 are singular, 1.5 too', () => {
      const noZero = '{count, plural, one {# tâche} other {# tâches}}';
      expect(formatMessage('fr', noZero, { count: 0 })).toBe('0 tâche');
      expect(formatMessage('fr', noZero, { count: 1 })).toBe('1 tâche');
      expect(formatMessage('fr', noZero, { count: 1.5 })).toBe('1,5 tâche');
      expect(formatMessage('fr', noZero, { count: 2 })).toBe('2 tâches');
    });

    it('uses the English rule: only 1 is singular', () => {
      expect(formatMessage('en', en, { count: 1 })).toBe('1 task');
      expect(formatMessage('en', en, { count: 2 })).toBe('2 tasks');
    });

    it('formats `#` with locale digits', () => {
      expect(formatMessage('en', en, { count: 12000 })).toBe('12,000 tasks');
      expect(formatMessage('fr', fr, { count: 12000 })).toBe('12 000 tâches');
    });

    it('falls back to `other` when the value is missing', () => {
      expect(formatMessage('en', en)).toBe('# tasks');
    });

    it('supports several plurals and plain text around them', () => {
      const msg =
        '{a, plural, one {# bloc} other {# blocs}} · {b, plural, one {# déplacé} other {# déplacés}}';
      expect(formatMessage('fr', msg, { a: 3, b: 1 })).toBe('3 blocs · 1 déplacé');
    });

    it('supports nested arguments in branches', () => {
      const msg = '{count, plural, one {# tâche décalée} other {# tâches décalées}} de {duration}';
      expect(formatMessage('fr', msg, { count: 2, duration: '15 min' })).toBe(
        '2 tâches décalées de 15 min',
      );
    });
  });

  it('handles selectordinal', () => {
    const msg = '{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}';
    expect([1, 2, 3, 4, 11, 22].map((n) => formatMessage('en', msg, { n }))).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '22nd',
    ]);
  });

  it('handles select with an `other` fallback', () => {
    const msg = '{kind, select, task {Tâche créée} note {Note créée} other {Envoyé}}';
    expect(formatMessage('fr', msg, { kind: 'task' })).toBe('Tâche créée');
    expect(formatMessage('fr', msg, { kind: 'unknown' })).toBe('Envoyé');
    expect(formatMessage('fr', msg)).toBe('Envoyé');
  });

  it('degrades a malformed message to plain substitution', () => {
    expect(formatMessage('fr', 'Bonjour {name} {count, plural, one {x}', { name: 'Léa' })).toBe(
      'Bonjour Léa {count, plural, one {x}',
    );
  });
});

describe('parseMessage', () => {
  it.each([
    ['Unclosed', '{count, plural, one {x} other {y}'],
    ['Unexpected brace', 'oops }'],
    ['Missing other', '{count, plural, one {x}}'],
    ['Unknown type', '{count, date}'],
    ['Bad name', '{-x}'],
  ])('rejects %s', (_, source) => {
    expect(() => parseMessage(source)).toThrow(MessageSyntaxError);
  });
});

describe('messageVariables', () => {
  it('lists every variable, nested ones included, sorted', () => {
    expect(
      messageVariables(
        '{count, plural, one {# de {duration}} other {# {kind, select, a {{x}} other {}}}}',
      ),
    ).toEqual(['count', 'duration', 'kind', 'x']);
  });
});
