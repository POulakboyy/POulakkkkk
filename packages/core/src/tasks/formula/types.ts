/** Shared types of the formula language (2.8). */

export type FormulaValue = number | string | boolean;

/**
 * Values formulas can read by name. A key present with `undefined` is a known field that is
 * not set on this record (`missing-value`); an absent key is an `unknown-identifier`.
 */
export type FormulaScope = Readonly<Record<string, FormulaValue | undefined>>;

export type FormulaErrorCode =
  | 'too-long'
  | 'too-deep'
  | 'unexpected-char'
  | 'unterminated-string'
  | 'unexpected-token'
  | 'unexpected-end'
  | 'unknown-function'
  | 'arity'
  | 'unknown-identifier'
  | 'missing-value'
  | 'type'
  | 'division-by-zero'
  | 'not-finite';

export interface FormulaFailure {
  ok: false;
  /** Stable code for translated messages. */
  code: FormulaErrorCode;
  /** English, developer-facing description. */
  error: string;
  /** 0-based offset in the source where the problem starts. */
  position: number;
}

export type FormulaResult = { ok: true; value: FormulaValue } | FormulaFailure;

export interface FormulaLimits {
  /** Maximum source length in characters. Default 1 000. */
  maxLength?: number;
  /** Maximum nesting depth of the expression tree. Default 64. */
  maxDepth?: number;
}

export const DEFAULT_FORMULA_LIMITS: Readonly<Required<FormulaLimits>> = {
  maxLength: 1_000,
  maxDepth: 64,
};

/** Internal control-flow error; never escapes the public API. */
export class FormulaError extends Error {
  readonly code: FormulaErrorCode;
  readonly position: number;

  constructor(code: FormulaErrorCode, message: string, position: number) {
    super(message);
    this.name = 'FormulaError';
    this.code = code;
    this.position = position;
  }

  toFailure(): FormulaFailure {
    return { ok: false, code: this.code, error: this.message, position: this.position };
  }
}
