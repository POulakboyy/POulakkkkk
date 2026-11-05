/**
 * ICU-lite message formatting — the subset of ICU MessageFormat POuxis needs, with no dependency.
 *
 * Supported syntax (documented in docs/design/UX_WRITING.md):
 * - `{name}`                                    → the variable as is (`String(value)`)
 * - `{n, number}`                               → locale number (`1 234`)
 * - `{n, plural, =0 {…} one {# …} other {# …}}` → `Intl.PluralRules` category; `=N` wins;
 *                                                 `#` is the locale-formatted number
 * - `{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}`
 * - `{x, select, create {…} organize {…} other {…}}`
 * Branches may nest any of the above. `other` is mandatory in plural/select.
 * Not supported: `offset:`, apostrophe quoting, literal `{` `}` in copy (never needed: copy uses
 * typographic quotes « » “ ” and ’, never ASCII `'`).
 */
import type { Locale } from '@pouxis/core';
import { formatNumber, pluralRules } from './format.ts';

export type MessageVars = Record<string, string | number>;

type Branches = Map<string, Part[]>;

export type Part =
  | string
  | { kind: 'arg'; name: string }
  | { kind: 'number'; name: string }
  | { kind: 'pound' }
  | { kind: 'plural' | 'selectordinal' | 'select'; name: string; options: Branches };

export class MessageSyntaxError extends Error {
  override name = 'MessageSyntaxError';
}

/** Parses a message into parts. Throws `MessageSyntaxError` on malformed input. */
export function parseMessage(source: string): Part[] {
  let pos = 0;

  function fail(what: string): never {
    throw new MessageSyntaxError(`${what} at ${pos} in “${source}”`);
  }

  function skipSpaces(): void {
    while (pos < source.length && /\s/.test(source[pos]!)) pos++;
  }

  function readWord(): string {
    const start = pos;
    while (pos < source.length && /[^\s,{}]/.test(source[pos]!)) pos++;
    return source.slice(start, pos);
  }

  function parseParts(inPlural: boolean, nested: boolean): Part[] {
    const parts: Part[] = [];
    let text = '';
    const flush = () => {
      if (text) parts.push(text);
      text = '';
    };
    while (pos < source.length) {
      const ch = source[pos]!;
      if (ch === '{') {
        flush();
        parts.push(parseArgument(inPlural));
      } else if (ch === '}') {
        if (nested) break;
        fail('Unexpected “}”');
      } else if (ch === '#' && inPlural) {
        flush();
        parts.push({ kind: 'pound' });
        pos++;
      } else {
        text += ch;
        pos++;
      }
    }
    if (nested && pos >= source.length) fail('Unclosed “{”');
    flush();
    return parts;
  }

  function parseArgument(inPlural: boolean): Part {
    pos++; // {
    skipSpaces();
    const name = readWord();
    if (!/^\w+$/.test(name)) fail('Invalid argument name');
    skipSpaces();
    if (source[pos] === '}') {
      pos++;
      return { kind: 'arg', name };
    }
    if (source[pos] !== ',') fail('Expected “,” or “}”');
    pos++;
    skipSpaces();
    const type = readWord();
    skipSpaces();
    if (type === 'number') {
      if (source[pos] !== '}') fail('Expected “}”');
      pos++;
      return { kind: 'number', name };
    }
    if (type !== 'plural' && type !== 'selectordinal' && type !== 'select') {
      fail(`Unknown argument type “${type}”`);
    }
    if (source[pos] !== ',') fail('Expected “,”');
    pos++;
    const options: Branches = new Map();
    for (;;) {
      skipSpaces();
      if (pos >= source.length) fail('Unclosed “{”');
      if (source[pos] === '}') {
        pos++;
        break;
      }
      const selector = readWord();
      if (!selector) fail('Expected a selector');
      skipSpaces();
      if (source[pos] !== '{') fail('Expected “{”');
      pos++;
      options.set(selector, parseParts(type === 'select' ? inPlural : true, true));
      pos++; // }
    }
    if (!options.has('other')) fail('Missing “other” branch');
    return { kind: type, name, options };
  }

  return parseParts(false, false);
}

const parsed = new Map<string, Part[]>();

/**
 * Formats `message` with `vars`. Unknown variables are left visible as `{name}` so missing data
 * shows up in review instead of silently disappearing. A malformed message falls back to plain
 * `{name}` substitution (the dictionary tests make sure that never ships).
 */
export function formatMessage(locale: Locale, message: string, vars?: MessageVars): string {
  if (!message.includes('{')) return message;
  let parts = parsed.get(message);
  if (!parts) {
    try {
      parts = parseMessage(message);
    } catch {
      return message.replace(/\{(\w+)\}/g, (m, name: string) =>
        vars && name in vars ? String(vars[name]) : m,
      );
    }
    parsed.set(message, parts);
  }
  return render(parts, locale, vars, undefined);
}

function render(
  parts: readonly Part[],
  locale: Locale,
  vars: MessageVars | undefined,
  pound: number | undefined,
): string {
  let out = '';
  for (const part of parts) {
    if (typeof part === 'string') {
      out += part;
      continue;
    }
    switch (part.kind) {
      case 'pound':
        out += pound === undefined ? '#' : formatNumber(pound, locale);
        break;
      case 'arg': {
        const value = vars?.[part.name];
        out += value === undefined ? `{${part.name}}` : String(value);
        break;
      }
      case 'number': {
        const value = vars?.[part.name];
        out += value === undefined ? `{${part.name}}` : formatNumber(Number(value), locale);
        break;
      }
      case 'select': {
        const value = vars?.[part.name];
        const branch =
          (value === undefined ? undefined : part.options.get(String(value))) ??
          part.options.get('other')!;
        out += render(branch, locale, vars, pound);
        break;
      }
      case 'plural':
      case 'selectordinal': {
        const raw = vars?.[part.name];
        const n = raw === undefined ? Number.NaN : Number(raw);
        let branch = part.options.get('other')!;
        if (!Number.isNaN(n)) {
          const category = pluralRules(
            locale,
            part.kind === 'plural' ? 'cardinal' : 'ordinal',
          ).select(n);
          branch = part.options.get(`=${n}`) ?? part.options.get(category) ?? branch;
        }
        out += render(branch, locale, vars, Number.isNaN(n) ? undefined : n);
        break;
      }
    }
  }
  return out;
}

/** Names of every variable a message reads — used by tests to compare locales. */
export function messageVariables(message: string): string[] {
  const names = new Set<string>();
  const walk = (parts: readonly Part[]) => {
    for (const part of parts) {
      if (typeof part === 'string' || part.kind === 'pound') continue;
      names.add(part.name);
      if ('options' in part) for (const branch of part.options.values()) walk(branch);
    }
  };
  walk(parseMessage(message));
  return [...names].sort();
}
