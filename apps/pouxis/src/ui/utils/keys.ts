import { isApplePlatform } from './dom.ts';

const APPLE_SYMBOLS: Record<string, string> = {
  mod: '⌘',
  meta: '⌘',
  cmd: '⌘',
  ctrl: '⌃',
  control: '⌃',
  alt: '⌥',
  option: '⌥',
  shift: '⇧',
};

const OTHER_LABELS: Record<string, string> = {
  mod: 'Ctrl',
  meta: 'Win',
  cmd: 'Ctrl',
  ctrl: 'Ctrl',
  control: 'Ctrl',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
};

const COMMON: Record<string, string> = {
  enter: '↵',
  return: '↵',
  escape: 'Esc',
  esc: 'Esc',
  backspace: '⌫',
  delete: '⌦',
  tab: '⇥',
  space: 'Space',
  up: '↑',
  arrowup: '↑',
  down: '↓',
  arrowdown: '↓',
  left: '←',
  arrowleft: '←',
  right: '→',
  arrowright: '→',
};

/** Human label for one key of a shortcut (`mod` → `⌘` on Apple platforms, `Ctrl` elsewhere). */
export function formatKey(key: string, apple = isApplePlatform()): string {
  const k = key.toLowerCase();
  const modifier = apple ? APPLE_SYMBOLS[k] : OTHER_LABELS[k];
  if (modifier) return modifier;
  const common = COMMON[k];
  if (common) return common;
  return key.length === 1 ? key.toUpperCase() : key[0]!.toUpperCase() + key.slice(1);
}
