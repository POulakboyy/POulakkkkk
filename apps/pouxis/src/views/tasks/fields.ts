/**
 * Programmable task fields (2.8). Custom values live in `Task.fields`; a string value that
 * starts with `=` is a formula (spreadsheet convention) evaluated by the core formula engine.
 * Formulas may read built-in task fields, plain custom fields and other formulas; a formula
 * that (transitively) reads itself is reported as a cycle instead of recursing.
 */
import { tasks as engine, type Task } from '@pouxis/core';
import type { MessageKey } from '../../i18n/index.ts';

type FormulaValue = number | string | boolean;
type Scope = Record<string, FormulaValue | undefined>;

export type FieldKind = 'number' | 'text' | 'checkbox' | 'formula';

export type FieldResult =
  | { ok: true; value: FormulaValue }
  | { ok: false; code: engine.FormulaErrorCode | 'cycle'; position: number };

export interface FieldEntry {
  name: string;
  kind: FieldKind;
  /** Stored value; for formulas, the source without the leading `=`. */
  value: FormulaValue;
  /** Evaluation result, formulas only. */
  result?: FieldResult;
}

export const FORMULA_PREFIX = '=';

export function isFormula(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(FORMULA_PREFIX);
}

export function kindOf(value: FormulaValue): FieldKind {
  if (isFormula(value)) return 'formula';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'checkbox';
  return 'text';
}

/** Field names must be usable bare in a formula: letters, digits and underscores. */
export function isValidFieldName(name: string): boolean {
  return /^[\p{L}_][\p{L}\p{N}_]*$/u.test(name);
}

/** Evaluates every custom field of `task`, formulas included, in declaration order. */
export function resolveFields(task: Task): FieldEntry[] {
  const fields = task.fields ?? {};
  const base = engine.taskScope(task) as Scope;
  const results = new Map<string, FieldResult>();
  const visiting = new Set<string>();

  const evaluate = (name: string): FieldResult => {
    const cached = results.get(name);
    if (cached) return cached;
    if (visiting.has(name)) return { ok: false, code: 'cycle', position: 0 };
    visiting.add(name);
    const source = String(fields[name]).slice(FORMULA_PREFIX.length);
    const scope: Scope = Object.assign(Object.create(null) as Scope, base);
    let cycle = false;
    for (const [other, raw] of Object.entries(fields)) {
      if (!isFormula(raw) || !referencesName(source, other)) continue;
      const dep = evaluate(other);
      if (!dep.ok && dep.code === 'cycle') cycle = true;
      scope[other] = dep.ok ? dep.value : undefined;
    }
    visiting.delete(name);
    const out: FieldResult = cycle
      ? { ok: false, code: 'cycle', position: 0 }
      : toResult(engine.evaluateFormula(source, scope));
    results.set(name, out);
    return out;
  };

  return Object.entries(fields).map(([name, raw]) => {
    if (!isFormula(raw)) return { name, kind: kindOf(raw), value: raw };
    return {
      name,
      kind: 'formula' as const,
      value: raw.slice(FORMULA_PREFIX.length),
      result: evaluate(name),
    };
  });
}

/** Live preview of a formula being typed for the field `name` (not saved yet). */
export function previewFormula(task: Task, name: string, source: string): FieldResult {
  const fields = { ...(task.fields ?? {}), [name]: FORMULA_PREFIX + source };
  const entry = resolveFields({ ...task, fields }).find((f) => f.name === name);
  return entry?.result ?? { ok: false, code: 'unexpected-end', position: 0 };
}

function toResult(r: engine.FormulaResult): FieldResult {
  return r.ok ? r : { ok: false, code: r.code, position: r.position };
}

function referencesName(source: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}($|[^\\p{L}\\p{N}_])|\\[${escaped}\\]`, 'u').test(
    source,
  );
}

/** Identifier or bracketed name at `position`, else the next few characters. */
export function snippetAt(source: string, position: number): string {
  const rest = source.slice(position).trimStart();
  const ident = /^\[[^\]]*\]|^[\p{L}_][\p{L}\p{N}_]*/u.exec(rest)?.[0];
  if (ident) return ident.replace(/^\[|\]$/g, '');
  return rest.slice(0, 8) || source.slice(Math.max(0, position - 8), position);
}

/** Translated, actionable message for a failed formula. */
export function formulaError(
  source: string,
  result: Extract<FieldResult, { ok: false }>,
): { key: MessageKey; vars: Record<string, string> } {
  const near = snippetAt(source, result.position);
  switch (result.code) {
    case 'cycle':
      return { key: 'tasks.formulas.errors.cycle', vars: {} };
    case 'unknown-identifier':
      return { key: 'tasks.formulas.errors.unknownField', vars: { name: near } };
    case 'missing-value':
      return { key: 'tasks.formulas.errors.missingValue', vars: { name: near } };
    case 'division-by-zero':
      return {
        key: 'tasks.formulas.errors.divisionByZero',
        vars: { near: snippetAt(source, result.position + 1) },
      };
    case 'type':
      return { key: 'tasks.formulas.errors.type', vars: { near } };
    case 'unknown-function':
      return { key: 'tasks.formulas.errors.unknownFunction', vars: { name: near } };
    case 'too-long':
    case 'too-deep':
      return { key: 'tasks.formulas.errors.tooComplex', vars: {} };
    default:
      return { key: 'tasks.formulas.errors.syntax', vars: { near: near || source.slice(-8) } };
  }
}

/** Parses a field input value according to its kind. Returns `null` when not valid. */
export function parseFieldValue(kind: FieldKind, input: string): FormulaValue | null {
  switch (kind) {
    case 'number': {
      const n = Number(input.replace(',', '.').trim());
      return input.trim() !== '' && Number.isFinite(n) ? n : null;
    }
    case 'checkbox':
      return input === 'true';
    case 'formula':
      return input.trim() ? FORMULA_PREFIX + input.trim() : null;
    case 'text':
      return input;
  }
}
