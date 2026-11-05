import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_PREFS, sanitizeAppPrefs } from './appPrefs.ts';
import {
  createKeymapMatcher,
  findConflict,
  isValidCombo,
  normalizeCombo,
  parseBinding,
  parseKeymapOverrides,
  presetKeymap,
  resolveKeymap,
  type KeyEventLike,
} from './keymap.ts';
import { loadLabFeatures } from './LabView.tsx';
import { parseHash, routeHash } from './router.ts';
import { applyMode, applyTheme, modeForView, nextTheme } from './theme.ts';

const key = (k: string, mods: Partial<KeyEventLike> = {}): KeyEventLike => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe('router', () => {
  it('parses views and params, falling back to today', () => {
    expect(parseHash('#/tasks?task=a1').view).toBe('tasks');
    expect(parseHash('#/tasks?task=a1').params.get('task')).toBe('a1');
    expect(parseHash('#/capture').view).toBe('capture');
    expect(parseHash('#/nope').view).toBe('today');
    expect(parseHash('').view).toBe('today');
    expect(routeHash('settings', { gallery: '1' })).toBe('#/settings?gallery=1');
    expect(routeHash('lab')).toBe('#/lab');
  });
});

describe('app preferences', () => {
  it('coerces untrusted stored data field by field', () => {
    const prefs = sanitizeAppPrefs({
      theme: 'neon',
      zen: 'yes',
      chronotype: 'evening',
      keymapPreset: 'vim',
      location: { latitude: 120, longitude: 2 },
    });
    expect(prefs.theme).toBe(DEFAULT_APP_PREFS.theme);
    expect(prefs.zen).toBe(false);
    expect(prefs.chronotype).toBe('evening');
    expect(prefs.keymapPreset).toBe('vim');
    expect(prefs.location).toBeNull();
    expect(sanitizeAppPrefs(null)).toEqual(DEFAULT_APP_PREFS);
  });
});

describe('theme', () => {
  it('forces light, dark and e-ink and lets auto/daylight follow the system or the sun', () => {
    const root = document.createElement('html');
    applyTheme('dark', root);
    expect(root.dataset.theme).toBe('dark');
    applyTheme('daylight', root);
    expect(root.dataset.theme).toBeUndefined();
    applyTheme('eink', root);
    expect(root.dataset.theme).toBe('eink');
    applyTheme('auto', root);
    expect(root.dataset.theme).toBeUndefined();
  });

  it('cycles themes and tints views by the kind of work', () => {
    expect(nextTheme('eink')).toBe('auto');
    expect(nextTheme('auto')).toBe('light');
    expect(modeForView('canvas')).toBe('create');
    expect(modeForView('tasks')).toBe('execute');
    expect(modeForView('today')).toBeUndefined();
    expect(modeForView('today', 'create')).toBe('create');
    const root = document.createElement('html');
    applyMode('execute', root);
    expect(root.dataset.mode).toBe('execute');
    applyMode(undefined, root);
    expect(root.dataset.mode).toBeUndefined();
  });
});

describe('keymap', () => {
  it('validates combos and sequences', () => {
    expect(isValidCombo('mod+shift+k')).toBe(true);
    expect(isValidCombo('mod+shift')).toBe(false);
    expect(isValidCombo('ctrl+f13')).toBe(false);
    expect(parseBinding('g t')).toEqual(['g', 't']);
    expect(parseBinding('g nope+x')).toBeNull();
    expect(normalizeCombo('shift+mod+K')).toBe(normalizeCombo('mod+shift+k'));
  });

  it('reports JSON errors with their line', () => {
    expect(parseKeymapOverrides('')).toEqual({ ok: true, overrides: {} });
    const syntax = parseKeymapOverrides('{\n  "nav.today": [\n}');
    expect(!syntax.ok && syntax.error.code).toBe('syntax');
    const unknown = parseKeymapOverrides('{\n  "nav.today": [],\n  "nav.moon": []\n}');
    expect(!unknown.ok && unknown.error).toMatchObject({ code: 'unknownAction', line: 3 });
    const combo = parseKeymapOverrides('{ "nav.today": ["alt+"] }');
    expect(!combo.ok && combo.error.code).toBe('invalidCombo');
    expect(parseKeymapOverrides('[]')).toMatchObject({ ok: false, error: { code: 'notObject' } });
    expect(parseKeymapOverrides('{ "zen.toggle": null }')).toEqual({
      ok: true,
      overrides: { 'zen.toggle': [] },
    });
  });

  it('keeps the preset when overrides conflict', () => {
    const { keymap, error } = resolveKeymap('default', '{ "nav.tasks": ["alt+1"] }');
    expect(error).toMatchObject({ code: 'conflict', other: 'nav.today' });
    expect(keymap['nav.tasks']).toEqual(['alt+2']);
    expect(findConflict(presetKeymap('vim'))).toBeNull();
    expect(
      findConflict({ ...presetKeymap('default'), 'nav.lab': ['g'], 'nav.today': ['g d'] }),
    ).not.toBeNull();
  });

  it('matches chords and Vim sequences, ignoring plain keys while typing', () => {
    const matcher = createKeymapMatcher(presetKeymap('vim'), { apple: false });
    expect(matcher.handle(key('k', { ctrlKey: true }), true, 0)).toBe('command.open');
    expect(matcher.handle(key('g'), false, 10)).toBe('pending');
    expect(matcher.handle(key('t'), false, 20)).toBe('nav.tasks');
    expect(matcher.handle(key('j'), true, 30)).toBeNull();
    expect(matcher.handle(key('j'), false, 40)).toBe('move.next');
    // A sequence expires after the timeout.
    expect(matcher.handle(key('g'), false, 100)).toBe('pending');
    expect(matcher.handle(key('t'), false, 5000)).toBeNull();
  });
});

describe('lab', () => {
  it('tolerates a missing module, a failing one and a malformed export', async () => {
    expect(await loadLabFeatures({})).toEqual([]);
    const failing = { a: () => Promise.reject(new Error('boom')) };
    const warn = console.warn;
    console.warn = () => {};
    expect(await loadLabFeatures(failing)).toEqual([]);
    console.warn = warn;
    expect(await loadLabFeatures({ a: async () => ({ labFeatures: 'x' as never }) })).toEqual([]);
    const features = [{ id: 'x', title: 'X', description: 'd', Component: () => null }];
    expect(await loadLabFeatures({ a: async () => ({ labFeatures: features }) })).toBe(features);
  });
});
