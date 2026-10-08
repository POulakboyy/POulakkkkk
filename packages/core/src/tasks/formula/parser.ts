/**
 * Pratt parser of the formula language. Precedence, lowest first:
 * `||` · `&&` · `== !=` · `< <= > >=` · `+ -` · `* / %` · unary `- + !` · `^` (right-assoc.)
 * so `-2 ^ 2` is `-(2 ^ 2)` as in mathematics.
 */
import { FUNCTIONS } from './functions.ts';
import type { Token } from './lexer.ts';
import { FormulaError } from './types.ts';
import type { FormulaValue } from './types.ts';

export type BinaryOp =
  | '||'
  | '&&'
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '^';
export type UnaryOp = '-' | '+' | '!';

interface NodeBase {
  /** Source offset used in error reports. */
  pos: number;
  /** Height of the subtree (a leaf is 1). */
  depth: number;
}

export type Node =
  | (NodeBase & { kind: 'literal'; value: FormulaValue })
  | (NodeBase & { kind: 'ident'; name: string })
  | (NodeBase & { kind: 'unary'; op: UnaryOp; operand: Node })
  | (NodeBase & { kind: 'binary'; op: BinaryOp; left: Node; right: Node })
  | (NodeBase & { kind: 'call'; name: string; args: Node[] });

export type CallNode = Extract<Node, { kind: 'call' }>;

const BINDING: Readonly<Record<BinaryOp, number>> = {
  '||': 10,
  '&&': 20,
  '==': 30,
  '!=': 30,
  '<': 40,
  '<=': 40,
  '>': 40,
  '>=': 40,
  '+': 50,
  '-': 50,
  '*': 60,
  '/': 60,
  '%': 60,
  '^': 80,
};
const PREFIX_BINDING = 70;

function isBinaryOp(text: string): text is BinaryOp {
  return Object.hasOwn(BINDING, text);
}

/** Parses a whole token stream; `maxDepth` bounds both recursion and tree height. */
export function parse(tokens: readonly Token[], maxDepth: number): Node {
  let index = 0;
  const peek = (): Token => tokens[index] ?? (tokens[tokens.length - 1] as Token);
  const next = (): Token => {
    const token = peek();
    if (token.type !== 'eof') index++;
    return token;
  };

  const checkDepth = (depth: number, pos: number): void => {
    if (depth > maxDepth) {
      throw new FormulaError('too-deep', `Formula nested deeper than ${maxDepth}`, pos);
    }
  };

  const expect = (type: Token['type'], what: string): Token => {
    const token = next();
    if (token.type !== type) throw unexpected(token, what);
    return token;
  };

  function expression(rbp: number, level: number): Node {
    checkDepth(level, peek().pos);
    let left = prefix(next(), level);
    for (;;) {
      const token = peek();
      if (token.type !== 'op' || !isBinaryOp(token.text) || BINDING[token.text] <= rbp) break;
      next();
      const op = token.text;
      const rightBinding = op === '^' ? BINDING[op] - 1 : BINDING[op];
      const right = expression(rightBinding, level + 1);
      const depth = 1 + Math.max(left.depth, right.depth);
      checkDepth(depth, token.pos);
      left = { kind: 'binary', op, left, right, pos: token.pos, depth };
    }
    return left;
  }

  function prefix(token: Token, level: number): Node {
    switch (token.type) {
      case 'number':
      case 'string':
        return { kind: 'literal', value: token.value as FormulaValue, pos: token.pos, depth: 1 };
      case 'ident':
        return identifier(token, level);
      case '(': {
        const inner = expression(0, level + 1);
        expect(')', '")"');
        return inner;
      }
      case 'op':
        if (token.text === '-' || token.text === '+' || token.text === '!') {
          const operand = expression(PREFIX_BINDING, level + 1);
          const depth = operand.depth + 1;
          checkDepth(depth, token.pos);
          return { kind: 'unary', op: token.text, operand, pos: token.pos, depth };
        }
        throw unexpected(token, 'a value');
      default:
        throw unexpected(token, 'a value');
    }
  }

  function identifier(token: Token, level: number): Node {
    const keyword = token.bracketed ? undefined : token.text.toLowerCase();
    if (keyword === 'true' || keyword === 'false') {
      return { kind: 'literal', value: keyword === 'true', pos: token.pos, depth: 1 };
    }
    if (keyword === undefined || peek().type !== '(') {
      return { kind: 'ident', name: token.text, pos: token.pos, depth: 1 };
    }
    return call(token, keyword, level);
  }

  function call(token: Token, name: string, level: number): Node {
    const spec = FUNCTIONS.get(name);
    if (!spec) {
      throw new FormulaError('unknown-function', `Unknown function "${token.text}"`, token.pos);
    }
    next(); // (
    const args: Node[] = [];
    if (peek().type !== ')') {
      do args.push(expression(0, level + 1));
      while (peek().type === ',' && next());
    }
    expect(')', '"," or ")"');
    if (args.length < spec.minArgs || args.length > spec.maxArgs) {
      throw new FormulaError('arity', arityMessage(name, spec.minArgs, spec.maxArgs), token.pos);
    }
    const depth = 1 + Math.max(0, ...args.map((a) => a.depth));
    checkDepth(depth, token.pos);
    return { kind: 'call', name, args, pos: token.pos, depth };
  }

  const root = expression(0, 1);
  const rest = peek();
  if (rest.type !== 'eof') throw unexpected(rest, 'an operator or the end of the formula');
  return root;
}

function unexpected(token: Token, expected: string): FormulaError {
  if (token.type === 'eof') {
    return new FormulaError('unexpected-end', `Formula ends early: expected ${expected}`, token.pos);
  }
  const shown = token.type === 'string' ? JSON.stringify(token.text) : `"${token.text}"`;
  return new FormulaError('unexpected-token', `Unexpected ${shown}: expected ${expected}`, token.pos);
}

function arityMessage(name: string, min: number, max: number): string {
  if (min === max) return `${name}() takes ${min} argument${min === 1 ? '' : 's'}`;
  if (max === Number.POSITIVE_INFINITY) return `${name}() takes at least ${min} argument(s)`;
  return `${name}() takes ${min} to ${max} arguments`;
}
