import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFS, type UserPrefs } from '@pouxis/core';

const prefs = vi.hoisted(() => ({ current: {} as Partial<UserPrefs> }));

vi.mock('../store/index.ts', () => ({
  usePrefs: () => ({ ...DEFAULT_PREFS, ...prefs.current }),
}));

const { LOCALES, NBSP, NNBSP, translate, useFormat, useT } = await import('./index.ts');
type Key = Parameters<typeof translate>[1];

describe('translate', () => {
  it('formats plurals per locale', () => {
    expect(translate('fr', 'common.count.tasks', { count: 0 })).toBe('Aucune tâche');
    expect(translate('fr', 'common.count.tasks', { count: 3 })).toBe('3 tâches');
    expect(translate('en', 'common.count.tasks', { count: 1 })).toBe('1 task');
  });

  it('serves typeset copy', () => {
    expect(translate('fr', 'tasks.matrix.whyHere')).toBe(`Pourquoi ici${NNBSP}?`);
    expect(translate('fr', 'today.unlocked.title', { title: 'Écrire' })).toBe(
      `«${NBSP}Écrire${NBSP}» peut commencer`,
    );
    expect(translate('en', 'tasks.matrix.whyHere')).toBe('Why here?');
  });

  it('does not typeset interpolated values', () => {
    expect(translate('fr', 'tasks.dependencies.waitingOn', { title: 'Quoi ?' })).toBe(
      `Attend «${NBSP}Quoi ?${NBSP}»`,
    );
  });

  it('falls back to the key for unknown keys', () => {
    expect(translate('en', 'nope.missing' as Key)).toBe('nope.missing');
  });

  it('lists supported locales, French first', () => {
    expect(LOCALES).toEqual(['fr', 'en']);
  });
});

describe('hooks', () => {
  it('useT follows the user locale', () => {
    prefs.current = { locale: 'en' };
    const { result } = renderHook(() => useT());
    expect(result.current('nav.today')).toBe('Today');
    prefs.current = { locale: 'fr' };
    const { result: fr } = renderHook(() => useT());
    expect(fr.current('nav.today')).toBe('Aujourd’hui');
  });

  it('useFormat binds the locale and the user time zone', () => {
    prefs.current = { locale: 'fr', timeZone: 'Asia/Tokyo' };
    const { result } = renderHook(() => useFormat());
    expect(result.current.timeZone).toBe('Asia/Tokyo');
    expect(result.current.time(Date.UTC(2026, 9, 8, 12, 30))).toBe('21:30');
    expect(result.current.duration(90, 'compact')).toBe('1h30');
    expect(result.current.list(['a', 'b'])).toBe('a et b');
  });
});
