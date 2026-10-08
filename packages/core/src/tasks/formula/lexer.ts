/** Tokenizer of the formula language. */
import { FormulaError } from './types.ts';

export type TokenType = 'number' | 'string' | 'ident' | 'op' | '(' | ')' | ',' | 'eof';

export interface Token {
  type: TokenType;
  /** Operator symbol (normalised: `=` → `==`, `<>` → `!=`), identifier name or raw text. */
  text: string;
  /** Parsed value of number and string literals. */
  value?: number | string;
  pos: number;
}

/** Longest operators first so `<=` wins over `<`. */
const OPERATORS = ['||', '&&', '==', '!=', '<>', '<=', '>=', '<', '>', '=', '+', '-', '*', '/', '%', '^', '!'];
const ALIASES: Record<string, string> = { '=': '==', '<>': '!=' };

const NUMBER = /\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?/y;
const IDENT = /[\p{L}_][\p{L}\p{N}_]*/uy;
const SPACE = /\s+/y;
const ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r' };

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  while (pos < source.length) {
    const spaces = matchAt(SPACE, source, pos);
    if (spaces) {
      pos += spaces.length;
      continue;
    }
    const token = readToken(source, pos);
    tokens.push(token);
    pos = token.pos + (tokenLength(source, token) ?? 1);
  }
  tokens.push({ type: 'eof', text: '', pos: source.length });
  return tokens;
}

/** Length consumed by `token` in `source` (kept separate so tokens stay small). */
function tokenLength(source: string, token: Token): number | undefined {
  return lengths.get(token) ?? (source.length > 0 ? undefined : 0);
}

const lengths = new WeakMap<Token, number>();

function emit(token: Token, length: number): Token {
  lengths.set(token, length);
  return token;
}

function readToken(source: string, pos: number): Token {
  const ch = source[pos] ?? '';
  if (ch === '(' || ch === ')' || ch === ',') return emit({ type: ch, text: ch, pos }, 1);
  if (ch === '"' || ch === "'") return readString(source, pos, ch);
  if (ch === '[') return readBracketIdent(source, pos);

  const number = matchAt(NUMBER, source, pos);
  if (number) return emit({ type: 'number', text: number, value: Number(number), pos }, number.length);

  const ident = matchAt(IDENT, source, pos);
  if (ident) return emit({ type: 'ident', text: ident, pos }, ident.length);

  for (const op of OPERATORS) {
    if (source.startsWith(op, pos)) {
      return emit({ type: 'op', text: ALIASES[op] ?? op, pos }, op.length);
    }
  }
  throw new FormulaError('unexpected-char', `Unexpected character "${ch}"`, pos);
}

function readString(source: string, start: number, quote: string): Token {
  let value = '';
  let pos = start + 1;
  while (pos < source.length) {
    const ch = source[pos] as string;
    if (ch === quote) return emit({ type: 'string', text: value, value, pos: start }, pos + 1 - start);
    if (ch === '\\' && pos + 1 < source.length) {
      const next = source[pos + 1] as string;
      value += ESCAPES[next] ?? next;
      pos += 2;
      continue;
    }
    value += ch;
    pos++;
  }
  throw new FormulaError('unterminated-string', 'Unterminated string', start);
}

/** `[Taux horaire]`: a field name that contains spaces or punctuation. */
function readBracketIdent(source: string, start: number): Token {
  const end = source.indexOf(']', start + 1);
  const name = end === -1 ? '' : source.slice(start + 1, end).trim();
  if (end === -1 || name === '' || /[[\n\r]/.test(name)) {
    throw new FormulaError('unexpected-char', 'Malformed [field name]', start);
  }
  return emit({ type: 'ident', text: name, pos: start }, end + 1 - start);
}

function matchAt(re: RegExp, source: string, pos: number): string | undefined {
  re.lastIndex = pos;
  return re.exec(source)?.[0];
}
