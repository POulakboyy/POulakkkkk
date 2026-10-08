import { useEffect, useRef, type RefObject } from 'react';
import { isApplePlatform, isEditableTarget } from '../utils/dom.ts';

/** A parsed shortcut such as `mod+shift+k`. */
export interface Hotkey {
  key: string;
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

const ALIASES: Record<string, string> = {
  esc: 'escape',
  return: 'enter',
  space: ' ',
  spacebar: ' ',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  del: 'delete',
  plus: '+',
  cmd: 'meta',
  command: 'meta',
  control: 'ctrl',
  option: 'alt',
};

/** Parses `"mod+k"`, `"shift+?"`, `"escape"`, `"alt+t"`. `mod` = ⌘ on Apple platforms, Ctrl elsewhere. */
export function parseHotkey(combo: string): Hotkey {
  const parts = combo
    .toLowerCase()
    .split(/\+(?!$)/)
    .map((p) => p.trim())
    .map((p) => ALIASES[p] ?? p);
  const hk: Hotkey = { key: '', mod: false, ctrl: false, meta: false, alt: false, shift: false };
  for (const part of parts) {
    if (part === 'mod') hk.mod = true;
    else if (part === 'ctrl') hk.ctrl = true;
    else if (part === 'meta') hk.meta = true;
    else if (part === 'alt') hk.alt = true;
    else if (part === 'shift') hk.shift = true;
    else hk.key = part;
  }
  return hk;
}

/** Whether a keyboard event matches a parsed hotkey. Modifiers must match exactly. */
export function matchHotkey(e: KeyboardEvent, hk: Hotkey, apple = isApplePlatform()): boolean {
  const wantMeta = hk.meta || (hk.mod && apple);
  const wantCtrl = hk.ctrl || (hk.mod && !apple);
  if (e.metaKey !== wantMeta || e.ctrlKey !== wantCtrl || e.altKey !== hk.alt) return false;
  const key = e.key.toLowerCase();
  // Symbols such as `?` already imply Shift; letters/named keys require an exact Shift match.
  const isSymbol = hk.key.length === 1 && !/[a-z0-9]/.test(hk.key);
  if (!isSymbol && e.shiftKey !== hk.shift) return false;
  if (key === hk.key) return true;
  // With Alt (⌥ on macOS) `e.key` is a composed character: fall back to the physical key.
  if (hk.key.length === 1 && /[a-z]/.test(hk.key)) return e.code === `Key${hk.key.toUpperCase()}`;
  if (hk.key.length === 1 && /[0-9]/.test(hk.key)) return e.code === `Digit${hk.key}`;
  return false;
}

export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

export interface HotkeyOptions {
  /** Only listen to key presses inside this element (focus within). Default: the whole window. */
  scope?: RefObject<HTMLElement | null>;
  /** Default `true`. */
  enabled?: boolean;
  /**
   * Ignore presses typed into text fields. Default `true`; shortcuts that use ⌘/Ctrl/Alt still
   * fire inside fields, since they cannot produce text.
   */
  ignoreInputs?: boolean;
  /** Call `preventDefault()` when a binding fires. Default `true`. */
  preventDefault?: boolean;
}

/**
 * Keyboard shortcuts, global or scoped to a subtree.
 *
 * @example useHotkeys({ 'mod+k': openCommand, 'shift+?': showHelp, e: archive }, { scope: listRef });
 */
export function useHotkeys(bindings: HotkeyMap, options: HotkeyOptions = {}): void {
  const { scope, enabled = true, ignoreInputs = true, preventDefault = true } = options;
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;
  const signature = Object.keys(bindings).join('|');

  useEffect(() => {
    if (!enabled) return;
    const target: HTMLElement | Window | null = scope ? scope.current : window;
    if (!target) return;
    const parsed = Object.keys(bindingsRef.current).map((combo) => [combo, parseHotkey(combo)] as const);
    const apple = isApplePlatform();
    const onKeyDown = (event: Event) => {
      const e = event as KeyboardEvent;
      if (e.isComposing || e.defaultPrevented) return;
      for (const [combo, hk] of parsed) {
        if (!matchHotkey(e, hk, apple)) continue;
        const commandLike = hk.mod || hk.ctrl || hk.meta || hk.alt;
        if (ignoreInputs && !commandLike && isEditableTarget(e.target)) return;
        if (preventDefault) e.preventDefault();
        bindingsRef.current[combo]?.(e);
        return;
      }
    };
    target.addEventListener('keydown', onKeyDown);
    return () => target.removeEventListener('keydown', onKeyDown);
  }, [scope, enabled, ignoreInputs, preventDefault, signature]);
}
