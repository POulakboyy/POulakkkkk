/**
 * Keyboard remapping (7.8). Every app-wide shortcut is an action bound to one or more
 * bindings; a binding is one combo (`mod+k`) or a sequence of combos separated by spaces
 * (`g t`, Vim-style). The user edits overrides as JSON in Settings:
 *
 * ```json
 * { "nav.today": ["alt+1", "g d"], "zen.toggle": null }
 * ```
 *
 * `null` or `[]` unbinds an action. Invalid JSON never replaces the working keymap: the error is
 * reported with its line and the previous bindings stay active.
 */
import { useEffect, useRef } from 'react';
import { matchHotkey, parseHotkey } from '../ui/index.ts';

export const KEYMAP_ACTIONS = [
  'command.open',
  'command.palette',
  'nav.today',
  'nav.tasks',
  'nav.calendar',
  'nav.canvas',
  'nav.ideas',
  'nav.insights',
  'nav.settings',
  'nav.lab',
  'note.new',
  'ideas.brainDump',
  'focus.start',
  'theme.cycle',
  'zen.toggle',
  'move.next',
  'move.previous',
] as const;
export type KeymapAction = (typeof KEYMAP_ACTIONS)[number];

export type Keymap = Record<KeymapAction, readonly string[]>;
export type KeymapOverrides = Partial<Record<KeymapAction, readonly string[]>>;

export const DEFAULT_KEYMAP: Keymap = {
  'command.open': ['mod+k'],
  'command.palette': ['mod+shift+k'],
  'nav.today': ['alt+1'],
  'nav.tasks': ['alt+2'],
  'nav.calendar': ['alt+3'],
  'nav.canvas': ['alt+4'],
  'nav.ideas': ['alt+5'],
  'nav.insights': ['alt+6'],
  'nav.settings': ['mod+,'],
  'nav.lab': [],
  'note.new': ['alt+n'],
  'ideas.brainDump': ['alt+d'],
  'focus.start': ['alt+f'],
  'theme.cycle': ['alt+t'],
  'zen.toggle': ['alt+z'],
  'move.next': [],
  'move.previous': [],
};

/** Vim preset: `g` + letter to jump between views, `j`/`k` to move, `:` for commands. */
export const VIM_KEYMAP: KeymapOverrides = {
  'command.open': ['mod+k', '/'],
  'command.palette': ['mod+shift+k', ':'],
  'nav.today': ['alt+1', 'g d'],
  'nav.tasks': ['alt+2', 'g t'],
  'nav.calendar': ['alt+3', 'g c'],
  'nav.canvas': ['alt+4', 'g v'],
  'nav.ideas': ['alt+5', 'g i'],
  'nav.insights': ['alt+6', 'g b'],
  'nav.settings': ['mod+,', 'g s'],
  'nav.lab': ['g l'],
  'move.next': ['j'],
  'move.previous': ['k'],
};

export function presetKeymap(preset: 'default' | 'vim'): Keymap {
  return preset === 'vim' ? { ...DEFAULT_KEYMAP, ...VIM_KEYMAP } : { ...DEFAULT_KEYMAP };
}

/* ------------------------------------------------------------------------------------------ */
/* Combos                                                                                      */
/* ------------------------------------------------------------------------------------------ */

const MODIFIERS = new Set([
  'mod',
  'ctrl',
  'control',
  'meta',
  'cmd',
  'command',
  'alt',
  'option',
  'shift',
]);
const NAMED_KEYS = new Set([
  'escape',
  'esc',
  'enter',
  'return',
  'tab',
  'space',
  'backspace',
  'delete',
  'del',
  'up',
  'down',
  'left',
  'right',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'home',
  'end',
  'pageup',
  'pagedown',
  'plus',
  ...Array.from({ length: 12 }, (_, i) => `f${i + 1}`),
]);

/** Splits `mod+shift++` into `['mod', 'shift', '+']` (a trailing `+` is the key itself). */
function comboParts(combo: string): string[] {
  return combo
    .toLowerCase()
    .split(/\+(?!$)/)
    .map((p) => p.trim());
}

/** Whether `combo` is one well-formed chord: known modifiers, exactly one key. */
export function isValidCombo(combo: string): boolean {
  if (combo.trim() === '' || /\s/.test(combo.trim())) return false;
  const parts = comboParts(combo);
  const keys = parts.filter((p) => !MODIFIERS.has(p));
  if (keys.length !== 1) return false;
  const key = keys[0]!;
  return [...key].length === 1 || NAMED_KEYS.has(key);
}

/** Splits a binding into its steps (`g t` → `['g', 't']`); `null` when any step is invalid. */
export function parseBinding(binding: string): string[] | null {
  const steps = binding.trim().split(/\s+/);
  if (steps.length === 0 || steps.length > 4) return null;
  return steps.every(isValidCombo) ? steps : null;
}

/** Canonical form so `shift+mod+K` and `mod+shift+k` compare equal. */
export function normalizeCombo(combo: string): string {
  const hk = parseHotkey(combo);
  const mods = [
    hk.mod && 'mod',
    hk.ctrl && 'ctrl',
    hk.meta && 'meta',
    hk.alt && 'alt',
    hk.shift && 'shift',
  ];
  return [...mods.filter(Boolean), hk.key].join('+');
}

function normalizeBinding(steps: readonly string[]): string {
  return steps.map(normalizeCombo).join(' ');
}

function hasModifier(combo: string): boolean {
  const hk = parseHotkey(combo);
  return hk.mod || hk.ctrl || hk.meta || hk.alt;
}

/* ------------------------------------------------------------------------------------------ */
/* JSON overrides                                                                              */
/* ------------------------------------------------------------------------------------------ */

export type KeymapErrorCode =
  'syntax' | 'notObject' | 'unknownAction' | 'invalidValue' | 'invalidCombo' | 'conflict';

export interface KeymapError {
  code: KeymapErrorCode;
  /** 1-based line of the offending text. */
  line: number;
  /** The action, binding or JSON message the error is about. */
  detail?: string;
  /** For `conflict`: the action already using the binding. */
  other?: KeymapAction;
}

export type KeymapParseResult =
  { ok: true; overrides: KeymapOverrides } | { ok: false; error: KeymapError };

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

/** Line of `"key":` in the source, or of the first occurrence of `"needle"` as a fallback. */
function lineOf(text: string, needle: string, asKey = false): number {
  const quoted = JSON.stringify(needle);
  const at = asKey
    ? text.search(new RegExp(`${quoted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`))
    : text.indexOf(quoted);
  return at < 0 ? 1 : lineAt(text, at);
}

/** Engines report either `(line N column M)` or `at position N`; both are mapped to a line. */
function syntaxLine(text: string, message: string): number {
  const line = /line (\d+)/i.exec(message);
  if (line) return Number(line[1]);
  const pos = /position (\d+)/i.exec(message);
  if (pos) return lineAt(text, Number(pos[1]));
  return lineAt(text, text.length);
}

function isAction(value: string): value is KeymapAction {
  return (KEYMAP_ACTIONS as readonly string[]).includes(value);
}

/** Parses and validates the JSON overrides. An empty text is a valid, empty set. */
export function parseKeymapOverrides(text: string): KeymapParseResult {
  if (text.trim() === '') return { ok: true, overrides: {} };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: { code: 'syntax', line: syntaxLine(text, message) } };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: { code: 'notObject', line: 1 } };
  }
  const overrides: KeymapOverrides = {};
  for (const [action, value] of Object.entries(data as Record<string, unknown>)) {
    const line = lineOf(text, action, true);
    if (!isAction(action)) {
      return { ok: false, error: { code: 'unknownAction', line, detail: action } };
    }
    const list = value === null ? [] : typeof value === 'string' ? [value] : value;
    if (!Array.isArray(list) || !list.every((b): b is string => typeof b === 'string')) {
      return { ok: false, error: { code: 'invalidValue', line, detail: action } };
    }
    for (const binding of list) {
      if (!parseBinding(binding)) {
        return {
          ok: false,
          error: { code: 'invalidCombo', line: lineOf(text, binding), detail: binding },
        };
      }
    }
    overrides[action] = list;
  }
  return { ok: true, overrides };
}

/**
 * Finds two actions sharing a binding, or a sequence that starts with another action's whole
 * binding (`g` vs `g t`: the second could never fire).
 */
export function findConflict(
  keymap: Keymap,
): { binding: string; action: KeymapAction; other: KeymapAction } | null {
  const seen = new Map<string, KeymapAction>();
  for (const action of KEYMAP_ACTIONS) {
    for (const binding of keymap[action]) {
      const steps = parseBinding(binding);
      if (!steps) continue;
      const norm = normalizeBinding(steps);
      for (const [other, owner] of seen) {
        if (owner === action) continue;
        if (other === norm || norm.startsWith(`${other} `) || other.startsWith(`${norm} `)) {
          return { binding, action, other: owner };
        }
      }
      seen.set(norm, action);
    }
  }
  return null;
}

export interface ResolvedKeymap {
  keymap: Keymap;
  error: KeymapError | null;
}

/**
 * Preset + user overrides. On any error the preset alone is returned with the error, so a typo
 * in the JSON never leaves the user without shortcuts.
 */
export function resolveKeymap(preset: 'default' | 'vim', overridesText: string): ResolvedKeymap {
  const base = presetKeymap(preset);
  const parsed = parseKeymapOverrides(overridesText);
  if (!parsed.ok) return { keymap: base, error: parsed.error };
  const merged = { ...base, ...parsed.overrides } as Keymap;
  const conflict = findConflict(merged);
  if (conflict) {
    return {
      keymap: base,
      error: {
        code: 'conflict',
        line: lineOf(overridesText, conflict.binding),
        detail: conflict.binding,
        other: conflict.other,
      },
    };
  }
  return { keymap: merged, error: null };
}

/** Pretty JSON of the overrides that differ from the preset, for the editor. */
export function overridesTemplate(keymap: KeymapOverrides): string {
  return `${JSON.stringify(keymap, null, 2)}\n`;
}

/* ------------------------------------------------------------------------------------------ */
/* Matching                                                                                    */
/* ------------------------------------------------------------------------------------------ */

export interface KeyEventLike {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const MODIFIER_KEYS = new Set(['Shift', 'Meta', 'Control', 'Alt', 'AltGraph', 'CapsLock']);

interface Compiled {
  action: KeymapAction;
  steps: ReturnType<typeof parseHotkey>[];
  /** Plain keys (`j`, `g t`, `/`) are ignored while typing in a field. */
  plain: boolean;
}

export interface KeymapMatcher {
  /** The action completed by this key press, `'pending'` mid-sequence, or `null`. */
  handle(event: KeyEventLike, typing: boolean, now?: number): KeymapAction | 'pending' | null;
  reset(): void;
}

export const SEQUENCE_TIMEOUT_MS = 1200;

export function createKeymapMatcher(
  keymap: Keymap,
  { apple, timeoutMs = SEQUENCE_TIMEOUT_MS }: { apple?: boolean; timeoutMs?: number } = {},
): KeymapMatcher {
  const compiled: Compiled[] = [];
  for (const action of KEYMAP_ACTIONS) {
    for (const binding of keymap[action]) {
      const steps = parseBinding(binding);
      if (!steps) continue;
      compiled.push({
        action,
        steps: steps.map(parseHotkey),
        plain: !steps.some(hasModifier),
      });
    }
  }

  let progress: { entry: Compiled; index: number }[] = [];
  let lastAt = 0;
  const matches = (e: KeyEventLike, hk: ReturnType<typeof parseHotkey>) =>
    matchHotkey(e as KeyboardEvent, hk, apple);

  function start(e: KeyEventLike, typing: boolean): KeymapAction | 'pending' | null {
    const next: typeof progress = [];
    for (const entry of compiled) {
      if (typing && entry.plain) continue;
      if (!matches(e, entry.steps[0]!)) continue;
      if (entry.steps.length === 1) return entry.action;
      next.push({ entry, index: 1 });
    }
    progress = next;
    return next.length > 0 ? 'pending' : null;
  }

  return {
    handle(e, typing, now = Date.now()) {
      if (MODIFIER_KEYS.has(e.key)) return progress.length > 0 ? 'pending' : null;
      const expired = now - lastAt > timeoutMs;
      lastAt = now;
      if (progress.length > 0 && !expired) {
        const advanced: typeof progress = [];
        for (const p of progress) {
          if (!matches(e, p.entry.steps[p.index]!)) continue;
          if (p.index + 1 === p.entry.steps.length) {
            progress = [];
            return p.entry.action;
          }
          advanced.push({ entry: p.entry, index: p.index + 1 });
        }
        if (advanced.length > 0) {
          progress = advanced;
          return 'pending';
        }
      }
      return start(e, typing);
    },
    reset() {
      progress = [];
    },
  };
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  const type = (target as HTMLInputElement).type;
  return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color'].includes(type);
}

export type KeymapHandlers = Partial<Record<KeymapAction, () => void>>;

/** Binds the resolved keymap to the window. Handlers may change on every render. */
export function useKeymap(keymap: Keymap, handlers: KeymapHandlers, enabled = true): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const matcher = createKeymapMatcher(keymap);
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const result = matcher.handle(e, isTyping(e.target));
      if (result === null) return;
      if (result === 'pending') {
        e.preventDefault();
        return;
      }
      const run = handlersRef.current[result];
      if (!run) return;
      e.preventDefault();
      run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keymap, enabled]);
}

/**
 * Moves focus to the next/previous tabbable element inside `root` (Vim `j`/`k`). Works with any
 * view without knowing its structure.
 */
export function moveFocus(direction: 1 | -1, root: HTMLElement | null): void {
  if (!root) return;
  const items = Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.closest('[hidden], [inert]') && el.getClientRects().length > 0);
  if (items.length === 0) return;
  const index = items.indexOf(document.activeElement as HTMLElement);
  const next =
    index < 0
      ? direction === 1
        ? 0
        : items.length - 1
      : (index + direction + items.length) % items.length;
  items[next]?.focus();
}
