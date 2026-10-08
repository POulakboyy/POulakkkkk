/**
 * Programmable fields (2.8): a small, safe expression language for computed task columns,
 * e.g. `hours(estimateMin) * rate` or `if(priority >= 2, "focus", "later")`.
 *
 * Safety: hand-written tokenizer, Pratt parser and tree-walking evaluator — no `eval`, no
 * `Function`, no property access, no loops. Source length and tree depth are bounded, so
 * evaluation time and stack use are bounded too. Only own keys of the scope are readable.
 */
import type { Task } from '../../model.ts';
import { evaluateNode } from './evaluator.ts';
import { tokenize } from './lexer.ts';
import { parse } from './parser.ts';
import type { Node } from './parser.ts';
import { taskScope } from './scope.ts';
import { DEFAULT_FORMULA_LIMITS, FormulaError } from './types.ts';
import type { FormulaFailure, FormulaLimits, FormulaResult, FormulaScope } from './types.ts';

export type {
  FormulaErrorCode,
  FormulaFailure,
  FormulaLimits,
  FormulaResult,
  FormulaScope,
  FormulaValue,
} from './types.ts';
export { DEFAULT_FORMULA_LIMITS } from './types.ts';
export { FUNCTION_NAMES } from './functions.ts';
export { TASK_FORMULA_FIELDS, taskScope } from './scope.ts';
export type { TaskFormulaField } from './scope.ts';

export interface CompiledFormula {
  readonly source: string;
  /** Names the formula reads, in order of first use — to validate or show dependencies. */
  readonly identifiers: readonly string[];
  evaluate(scope: FormulaScope): FormulaResult;
}

export type CompileResult = { ok: true; formula: CompiledFormula } | FormulaFailure;

/** Parses once for repeated evaluation (a computed column over many tasks). */
export function compileFormula(source: string, limits: FormulaLimits = {}): CompileResult {
  const { maxLength, maxDepth } = { ...DEFAULT_FORMULA_LIMITS, ...limits };
  if (source.length > maxLength) {
    return failure(new FormulaError('too-long', `Formula longer than ${maxLength} characters`, maxLength));
  }
  try {
    const root = parse(tokenize(source), maxDepth);
    const formula: CompiledFormula = {
      source,
      identifiers: identifiersOf(root),
      evaluate: (scope) => run(root, scope),
    };
    return { ok: true, formula };
  } catch (error) {
    return failure(error);
  }
}

export function evaluateFormula(
  source: string,
  scope: FormulaScope,
  limits: FormulaLimits = {},
): FormulaResult {
  const compiled = compileFormula(source, limits);
  return compiled.ok ? compiled.formula.evaluate(scope) : compiled;
}

/** Evaluates `source` against a task's built-in and custom fields. */
export function evaluateTaskFormula(
  source: string,
  task: Task,
  limits: FormulaLimits = {},
): FormulaResult {
  return evaluateFormula(source, taskScope(task), limits);
}

function run(root: Node, scope: FormulaScope): FormulaResult {
  try {
    return { ok: true, value: evaluateNode(root, scope) };
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown): FormulaFailure {
  if (error instanceof FormulaError) return error.toFailure();
  throw error;
}

function identifiersOf(root: Node): string[] {
  const names = new Set<string>();
  const visit = (node: Node): void => {
    switch (node.kind) {
      case 'ident':
        names.add(node.name);
        break;
      case 'unary':
        visit(node.operand);
        break;
      case 'binary':
        visit(node.left);
        visit(node.right);
        break;
      case 'call':
        node.args.forEach(visit);
        break;
      case 'literal':
        break;
    }
  };
  visit(root);
  return [...names];
}
