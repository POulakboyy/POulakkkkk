/** Built-in functions of the formula language. Names are case-insensitive (`ROUND` = `round`). */
import type { Node } from './parser.ts';
import { FormulaError } from './types.ts';
import type { FormulaValue } from './types.ts';

export interface FunctionSpec {
  minArgs: number;
  maxArgs: number;
  /** Absent for special forms the evaluator handles lazily (`if`). */
  apply?: (name: string, args: readonly FormulaValue[], nodes: readonly Node[]) => FormulaValue;
}

const MAX_ROUND_DIGITS = 15;

export const FUNCTIONS: ReadonlyMap<string, FunctionSpec> = new Map<string, FunctionSpec>([
  ['if', { minArgs: 3, maxArgs: 3 }],
  ['min', { minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, apply: (n, a, nodes) => Math.min(...numbers(n, a, nodes)) }],
  ['max', { minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, apply: (n, a, nodes) => Math.max(...numbers(n, a, nodes)) }],
  ['abs', unary(Math.abs)],
  ['ceil', unary(Math.ceil)],
  ['floor', unary(Math.floor)],
  ['hours', unary((minutes) => minutes / 60)],
  ['round', { minArgs: 1, maxArgs: 2, apply: round }],
]);

/** Names of the built-in functions, for autocompletion. */
export const FUNCTION_NAMES: readonly string[] = [...FUNCTIONS.keys()];

function unary(fn: (x: number) => number): FunctionSpec {
  return { minArgs: 1, maxArgs: 1, apply: (name, args, nodes) => fn(numberArg(name, args, nodes, 0)) };
}

function numbers(name: string, args: readonly FormulaValue[], nodes: readonly Node[]): number[] {
  return args.map((_, i) => numberArg(name, args, nodes, i));
}

function numberArg(
  name: string,
  args: readonly FormulaValue[],
  nodes: readonly Node[],
  i: number,
): number {
  const value = args[i];
  if (typeof value === 'number') return value;
  throw new FormulaError('type', `${name}() expects a number`, nodes[i]?.pos ?? 0);
}

/** Rounds half away from zero, on decimal digits (so `round(1.005, 2)` is 1.01). */
function round(name: string, args: readonly FormulaValue[], nodes: readonly Node[]): number {
  const x = numberArg(name, args, nodes, 0);
  const digits = args.length > 1 ? numberArg(name, args, nodes, 1) : 0;
  if (!Number.isInteger(digits) || digits < 0 || digits > MAX_ROUND_DIGITS) {
    throw new FormulaError(
      'type',
      `${name}() digits must be an integer from 0 to ${MAX_ROUND_DIGITS}`,
      nodes[1]?.pos ?? 0,
    );
  }
  const magnitude = shift(Math.round(shift(Math.abs(x), digits)), -digits);
  const result = x < 0 ? -magnitude : magnitude;
  return result === 0 ? 0 : result;
}

/** Multiplies by 10^by through the decimal representation, avoiding binary rounding drift. */
function shift(x: number, by: number): number {
  if (by === 0) return x;
  const [mantissa, exponent = '0'] = String(x).split('e');
  return Number(`${mantissa}e${Number(exponent) + by}`);
}
