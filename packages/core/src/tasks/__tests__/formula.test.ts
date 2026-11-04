import { describe, expect, it } from 'vitest';
import { MINUTE } from '../../time.ts';
import {
  compileFormula,
  evaluateFormula,
  evaluateTaskFormula,
  taskScope,
} from '../formula/index.ts';
import type { FormulaResult, FormulaScope } from '../formula/index.ts';
import { T0, task } from './fixtures.ts';

const ev = (source: string, scope: FormulaScope = {}): FormulaResult =>
  evaluateFormula(source, scope);
const value = (source: string, scope: FormulaScope = {}) => {
  const r = ev(source, scope);
  if (!r.ok) throw new Error(`${r.code}: ${r.error} @${r.position}`);
  return r.value;
};
const fail = (source: string, scope: FormulaScope = {}) => {
  const r = ev(source, scope);
  if (r.ok) throw new Error(`expected failure, got ${String(r.value)}`);
  return { code: r.code, position: r.position };
};

describe('literals and arithmetic', () => {
  it.each([
    ['1 + 2 * 3', 7],
    ['(1 + 2) * 3', 9],
    ['10 - 4 - 3', 3],
    ['2 ^ 3 ^ 2', 512],
    ['-2 ^ 2', -4],
    ['--3', 3],
    ['+4', 4],
    ['7 % 3', 1],
    ['7 / 2', 3.5],
    ['.5 + 1e2', 100.5],
    ['-0', 0],
  ])('%s = %s', (source, expected) => {
    expect(value(source)).toBe(expected);
  });

  it('handles strings, escapes and concatenation', () => {
    expect(value('"a" + \'b\'')).toBe('ab');
    expect(value('"n=" + 3')).toBe('n=3');
    expect(value('"say \\"hi\\"\\n"')).toBe('say "hi"\n');
  });

  it('handles booleans, comparisons and logic', () => {
    expect(value('true && !false')).toBe(true);
    expect(value('TRUE || x', { x: 1 })).toBe(true); // short-circuit: x is never read
    expect(value('false && x', {})).toBe(false);
    expect(value('1 < 2 && 2 <= 2 && 3 > 2 && 3 >= 4 == false')).toBe(true);
    expect(value('"a" < "b"')).toBe(true);
    expect(value('1 = 1')).toBe(true);
    expect(value('1 <> 2')).toBe(true);
    expect(value('1 == "1"')).toBe(false);
    expect(value('1 != "1"')).toBe(true);
  });
});

describe('identifiers and functions', () => {
  it('reads plain and bracketed identifiers', () => {
    expect(value('rate * 2', { rate: 21 })).toBe(42);
    expect(value('[Taux horaire] + 1', { 'Taux horaire': 9 })).toBe(10);
    expect(value('[if]', { if: 3 })).toBe(3);
    expect(value('durée', { durée: 5 })).toBe(5);
  });

  it('evaluates built-in functions case-insensitively', () => {
    expect(value('min(3, 1, 2) + MAX(4, 5)')).toBe(6);
    expect(value('round(1.005, 2)')).toBe(1.01);
    expect(value('round(-2.5)')).toBe(-3);
    expect(value('ceil(1.2) + floor(1.8) + abs(-3)')).toBe(6);
    expect(value('hours(90)')).toBe(1.5);
    expect(value('if(p >= 2, "focus", "later")', { p: 3 })).toBe('focus');
    expect(value('if(false, 1 / 0, 2)')).toBe(2); // lazy branches
  });
});

describe('errors', () => {
  it.each([
    ['1 +', 'unexpected-end', 3],
    ['1 2', 'unexpected-token', 2],
    ['(1', 'unexpected-end', 2],
    [')', 'unexpected-token', 0],
    ['1 # 2', 'unexpected-char', 2],
    ['"abc', 'unterminated-string', 0],
    ['[oops', 'unexpected-char', 0],
    ['foo(1)', 'unknown-function', 0],
    ['round()', 'arity', 0],
    ['if(true, 1)', 'arity', 0],
    ['1 / 0', 'division-by-zero', 2],
    ['5 % 0', 'division-by-zero', 2],
    ['10 ^ 400', 'not-finite', 3],
    ['-"a"', 'type', 0],
    ['!1', 'type', 0],
    ['1 && true', 'type', 2],
    ['1 < "a"', 'type', 2],
    ['true - 1', 'type', 5],
    ['if(1, 2, 3)', 'type', 3],
    ['min(1, "a")', 'type', 7],
    ['round(1, 1.5)', 'type', 9],
    ['missing + 1', 'unknown-identifier', 0],
  ])('%s → %s at %i', (source, code, position) => {
    expect(fail(source)).toEqual({ code, position });
  });

  it('distinguishes unknown from unset fields and rejects non-finite inputs', () => {
    expect(fail('x', { x: undefined }).code).toBe('missing-value');
    expect(fail('x', { x: Number.POSITIVE_INFINITY }).code).toBe('not-finite');
  });

  it('never reads inherited properties', () => {
    expect(fail('constructor').code).toBe('unknown-identifier');
    expect(fail('toString').code).toBe('unknown-identifier');
    expect(fail('__proto__').code).toBe('unknown-identifier');
  });

  it('enforces length and depth limits', () => {
    expect(evaluateFormula('1+1', {}, { maxLength: 2 })).toMatchObject({
      ok: false,
      code: 'too-long',
    });
    expect(fail('('.repeat(100) + '1' + ')'.repeat(100)).code).toBe('too-deep');
    expect(fail('-'.repeat(100) + '1').code).toBe('too-deep');
    expect(fail(Array.from({ length: 100 }, () => '1').join('+')).code).toBe('too-deep');
    expect(evaluateFormula('((1))', {}, { maxDepth: 2 })).toMatchObject({
      ok: false,
      code: 'too-deep',
    });
    expect(value('((((1))))')).toBe(1);
  });

  it('rejects code-injection attempts as plain syntax errors', () => {
    for (const source of ['process.exit()', 'this', 'a[0]', '`x`', 'x => x', 'a; b']) {
      expect(ev(source, { a: 1, b: 1, x: 1, process: 1 }).ok).toBe(false);
    }
  });
});

describe('compileFormula', () => {
  it('compiles once, lists identifiers and evaluates many scopes', () => {
    const compiled = compileFormula('hours(estimateMin) * rate + rate');
    if (!compiled.ok) throw new Error('expected ok');
    expect(compiled.formula.identifiers).toEqual(['estimateMin', 'rate']);
    expect(compiled.formula.evaluate({ estimateMin: 120, rate: 10 })).toEqual({
      ok: true,
      value: 30,
    });
    expect(compiled.formula.evaluate({ estimateMin: 60, rate: 1 })).toEqual({ ok: true, value: 2 });
  });

  it('reports syntax errors at compile time', () => {
    expect(compileFormula('1 +')).toMatchObject({ ok: false, code: 'unexpected-end' });
  });
});

describe('task formulas', () => {
  const t = task('a', {
    title: 'Write',
    priority: 3,
    estimateMin: 90,
    fields: { rate: 50, title: 'shadowed', client: 'ACME' },
    timeLogs: [{ start: T0, end: T0 + 30 * MINUTE, kind: 'focus' }],
  });

  it('exposes built-in fields that shadow custom ones', () => {
    const scope = taskScope(t);
    expect(scope['title']).toBe('Write');
    expect(scope['focusMin']).toBe(30);
    expect(scope['important']).toBe(true);
    expect(scope['done']).toBe(false);
    expect(Object.hasOwn(scope, 'energy')).toBe(true);
    expect(Object.getPrototypeOf(scope)).toBeNull();
  });

  it('evaluates against a task', () => {
    expect(evaluateTaskFormula('hours(estimateMin) * rate', t)).toEqual({ ok: true, value: 75 });
    expect(evaluateTaskFormula('client + " / " + status', t)).toEqual({
      ok: true,
      value: 'ACME / todo',
    });
    expect(evaluateTaskFormula('energy', t)).toMatchObject({ ok: false, code: 'missing-value' });
    expect(evaluateTaskFormula('focusMin / estimateMin < 0.5', t)).toEqual({
      ok: true,
      value: true,
    });
  });
});
