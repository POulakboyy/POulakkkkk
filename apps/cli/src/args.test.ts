import { describe, expect, it } from 'vitest';
import { parseCommandArgs, peekColorFlag, peekOption, splitCommand, suggest } from './args.ts';
import { messages } from './i18n/index.ts';

const m = messages('fr');

describe('args', () => {
  it('finds the command after global options that take a value', () => {
    expect(splitCommand(['--lang', 'en', 'ls', '--today'])).toEqual({
      command: 'ls',
      rest: ['--lang', 'en', '--today'],
    });
    expect(splitCommand(['--json'])).toEqual({ rest: ['--json'] });
  });

  it('peeks global options before parsing', () => {
    expect(peekOption(['ls', '--lang=en'], 'lang')).toBe('en');
    expect(peekColorFlag(['--color', '--no-color'])).toBe(false);
  });

  it('suggests close commands and unique prefixes', () => {
    expect(suggest('lsit', ['list', 'ls'])).toBe('list');
    expect(suggest('exp', ['export', 'edit'])).toBe('export');
    expect(suggest('zzzz', ['ls'])).toBeUndefined();
  });

  it('translates parse errors into usage errors with a suggestion', () => {
    const spec = { today: { type: 'boolean' } } as const;
    expect(() => parseCommandArgs(['--tday'], spec, m, 'ls')).toThrow(
      expect.objectContaining({ exitCode: 2, hint: 'Vouliez-vous dire « --today » ?' }),
    );
    expect(() => parseCommandArgs(['--lang'], spec, m, 'ls')).toThrow(/attend une valeur/);
    expect(parseCommandArgs(['a', '--today'], spec, m).bool('today')).toBe(true);
  });
});
