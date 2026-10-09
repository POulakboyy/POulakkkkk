/**
 * Tree-walking evaluator. Types are strict — no implicit coercion except string
 * concatenation with `+` — so mistakes surface as errors instead of odd values.
 */
import { FUNCTIONS } from './functions.ts';
import type { BinaryOp, CallNode, Node } from './parser.ts';
import { FormulaError } from './types.ts';
import type { FormulaScope, FormulaValue } from './types.ts';

export function evaluateNode(node: Node, scope: FormulaScope): FormulaValue {
  switch (node.kind) {
    case 'literal':
      return node.value;
    case 'ident':
      return resolve(node.name, node.pos, scope);
    case 'unary': {
      const value = evaluateNode(node.operand, scope);
      if (node.op === '!') return not(value, node.pos);
      if (typeof value !== 'number') throw typeError(`Unary "${node.op}" expects a number`, node);
      return node.op === '-' ? finite(-value, node) : value;
    }
    case 'binary':
      return binary(node.op, node.left, node.right, node.pos, scope);
    case 'call':
      return call(node, scope);
  }
}

function resolve(name: string, pos: number, scope: FormulaScope): FormulaValue {
  if (!Object.hasOwn(scope, name)) {
    throw new FormulaError('unknown-identifier', `Unknown field "${name}"`, pos);
  }
  const value = scope[name];
  if (value === undefined) throw new FormulaError('missing-value', `"${name}" is not set`, pos);
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new FormulaError('not-finite', `"${name}" is not a finite number`, pos);
  }
  return value;
}

function not(value: FormulaValue, pos: number): boolean {
  if (typeof value !== 'boolean') throw new FormulaError('type', '"!" expects a boolean', pos);
  return !value;
}

function binary(
  op: BinaryOp,
  leftNode: Node,
  rightNode: Node,
  pos: number,
  scope: FormulaScope,
): FormulaValue {
  const at = { pos };
  if (op === '&&' || op === '||') {
    const left = booleanOf(evaluateNode(leftNode, scope), op, at);
    if (op === '&&' ? !left : left) return left;
    return booleanOf(evaluateNode(rightNode, scope), op, at);
  }
  const left = evaluateNode(leftNode, scope);
  const right = evaluateNode(rightNode, scope);
  switch (op) {
    case '==':
      return typeof left === typeof right && left === right;
    case '!=':
      return !(typeof left === typeof right && left === right);
    case '<':
    case '<=':
    case '>':
    case '>=':
      return compare(op, left, right, at);
    case '+':
      if (typeof left === 'string' || typeof right === 'string') return `${left}${right}`;
      return finite(numberOf(left, op, at) + numberOf(right, op, at), at);
    default:
      return arithmetic(op, numberOf(left, op, at), numberOf(right, op, at), at);
  }
}

function arithmetic(op: BinaryOp, a: number, b: number, at: { pos: number }): number {
  switch (op) {
    case '-':
      return finite(a - b, at);
    case '*':
      return finite(a * b, at);
    case '/':
    case '%':
      if (b === 0) throw new FormulaError('division-by-zero', 'Division by zero', at.pos);
      return finite(op === '/' ? a / b : a % b, at);
    case '^':
      return finite(a ** b, at);
    default:
      throw typeError(`Unsupported operator "${op}"`, at);
  }
}

function compare(
  op: BinaryOp,
  left: FormulaValue,
  right: FormulaValue,
  at: { pos: number },
): boolean {
  const comparable =
    (typeof left === 'number' && typeof right === 'number') ||
    (typeof left === 'string' && typeof right === 'string');
  if (!comparable) throw typeError(`"${op}" compares two numbers or two strings`, at);
  if (op === '<') return left < right;
  if (op === '<=') return left <= right;
  if (op === '>') return left > right;
  return left >= right;
}

function call(node: CallNode, scope: FormulaScope): FormulaValue {
  if (node.name === 'if') {
    const [condition, then, otherwise] = node.args as [Node, Node, Node];
    const test = evaluateNode(condition, scope);
    if (typeof test !== 'boolean') {
      throw new FormulaError('type', 'if() expects a boolean condition', condition.pos);
    }
    return evaluateNode(test ? then : otherwise, scope);
  }
  const spec = FUNCTIONS.get(node.name);
  if (!spec?.apply) throw new FormulaError('unknown-function', `Unknown function "${node.name}"`, node.pos);
  const args = node.args.map((arg) => evaluateNode(arg, scope));
  const result = spec.apply(node.name, args, node.args);
  return typeof result === 'number' ? finite(result, node) : result;
}

function numberOf(value: FormulaValue, op: string, at: { pos: number }): number {
  if (typeof value !== 'number') throw typeError(`"${op}" expects numbers`, at);
  return value;
}

function booleanOf(value: FormulaValue, op: string, at: { pos: number }): boolean {
  if (typeof value !== 'boolean') throw typeError(`"${op}" expects booleans`, at);
  return value;
}

function finite(value: number, at: { pos: number }): number {
  if (!Number.isFinite(value)) throw new FormulaError('not-finite', 'Result is not a finite number', at.pos);
  return value === 0 ? 0 : value;
}

function typeError(message: string, at: { pos: number }): FormulaError {
  return new FormulaError('type', message, at.pos);
}
