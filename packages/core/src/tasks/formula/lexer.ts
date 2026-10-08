/** Tokenizer of the formula language. */
import { FormulaError } from './types.ts';

export type TokenType = 'number' | 'string' | 'ident' | 'op' | '(' | ')' | ',' | 'eof';

export interface Token {
  type: TokenType;
  /** Operator symbol (normalised: `=` → `==`, `<>` → `!=`), identifier name or raw text. */
  text: string;
  /** Parsed value of number and string literals. */
  value?: number | string;
  /** Offset of the first character. */
  pos: number;
  /** Offset just past the last character. */
  end: number;
  /** Identifier written as `[name]`: never a keyword nor a function name. */
  bracketed?: boolean;
}

/** Longest operators first so `<=` wins over `<`. */
const OPERATORS = [
  '||',
  '&&',
  '==',
  '!=',
  '<>',
  '<=',
  '>=',
  '<',
  '>',
  '=',
  '+',
  '-',
  '*',
  '/',
  '%',
  '^',
  '!',
];
const ALIASES: Readonly<Record<string, string>> = { '=': '==', '<>': '!=' };
const ESCAPES: Readonly<Record<string, string>> = { n: '\n', t: '\t', r: '\r' };

const NUMBER = /\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?/y;
const IDENT = /[\p{L}_][\p{L}\p{N}_]*/uy;
const SPACE = /\s+/y;

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  while (pos < source.length) {
    const spaces = matchAt(SPACE, source, pos);
    if (spaces !== undefined) {
      pos += spaces.length;
      continue;
    }
    const token = readToken(source, pos);
    tokens.push(token);
    pos = token.end;
  }
  tokens.push({ type: 'eof', text: '', pos: source.length, end: source.length });
  return tokens;
}

function readToken(source: string, pos: number): Token {
  const ch = source[pos] ?? '';
  if (ch === '(' || ch === ')' || ch === ',') return { type: ch, text: ch, pos, end: pos + 1 };
  if (ch === '"' || ch === "'") return readString(source, pos, ch);
  if (ch === '[') return readBracketIdent(source, pos);

  const number = matchAt(NUMBER, source, pos);
  if (number !== undefined) {
    return { type: 'number', text: number, value: Number(number), pos, end: pos + number.length };
  }
  const ident = matchAt(IDENT, source, pos);
  if (ident !== undefined) return { type: 'ident', text: ident, pos, end: pos + ident.length };

  for (const op of OPERATORS) {
    if (source.startsWith(op, pos)) {
      return { type: 'op', text: ALIASES[op] ?? op, pos, end: pos + op.length };
    }
  }
  throw new FormulaError('unexpected-char', `Unexpected character "${ch}"`, pos);
}

function readString(source: string, start: number, quote: string): Token {
  let value = '';
  let pos = start + 1;
  while (pos < source.length) {
    const ch = source[pos] as string;
    if (ch === quote) return { type: 'string', text: value, value, pos: start, end: pos + 1 };
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

/** `[Taux horaire]`: a field name containing spaces or punctuation. */
function readBracketIdent(source: string, start: number): Token {
  const close = source.indexOf(']', start + 1);
  const name = close === -1 ? '' : source.slice(start + 1, close).trim();
  if (close === -1 || name === '' || /[[\n\r]/.test(name)) {
    throw new FormulaError('unexpected-char', 'Malformed [field name]', start);
  }
  return { type: 'ident', text: name, pos: start, end: close + 1, bracketed: true };
}

function matchAt(re: RegExp, source: string, pos: number): string | undefined {
  re.lastIndex = pos;
  return re.exec(source)?.[0];
}
