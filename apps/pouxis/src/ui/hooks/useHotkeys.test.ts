import { describe, expect, it } from 'vitest';
import { matchHotkey, parseHotkey } from './useHotkeys.ts';

const key = (k: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', { key: k, ...init });

describe('hotkeys', () => {
  it('parses modifiers and aliases', () => {
    expect(parseHotkey('mod+shift+K')).toMatchObject({ key: 'k', mod: true, shift: true });
    expect(parseHotkey('esc').key).toBe('escape');
    expect(parseHotkey('mod++').key).toBe('+');
  });

  it('maps mod to ⌘ on Apple platforms and Ctrl elsewhere', () => {
    const hk = parseHotkey('mod+k');
    expect(matchHotkey(key('k', { metaKey: true }), hk, true)).toBe(true);
    expect(matchHotkey(key('k', { ctrlKey: true }), hk, true)).toBe(false);
    expect(matchHotkey(key('k', { ctrlKey: true }), hk, false)).toBe(true);
  });

  it('requires exact modifiers but lets symbols imply Shift', () => {
    expect(matchHotkey(key('e', { shiftKey: true }), parseHotkey('e'), false)).toBe(false);
    expect(matchHotkey(key('?', { shiftKey: true }), parseHotkey('?'), false)).toBe(true);
  });

  it('falls back to the physical key with Alt', () => {
    expect(matchHotkey(key('†', { altKey: true, code: 'KeyT' }), parseHotkey('alt+t'), true)).toBe(
      true,
    );
  });
});
