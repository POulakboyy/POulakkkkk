import { describe, expect, it } from 'vitest';
import {
  formulaError,
  isValidFieldName,
  kindOf,
  parseFieldValue,
  previewFormula,
  resolveFields,
} from '../fields.ts';
import { task } from './fixtures.ts';

describe('resolveFields', () => {
  it('evaluates formulas over built-in and custom fields, chained', () => {
    const t = task({
      estimateMin: 90,
      fields: { taux: 80, cout: '=estimateMin / 60 * taux', ttc: '=cout * 1.2', note: 'ok' },
    });
    const byName = Object.fromEntries(resolveFields(t).map((f) => [f.name, f]));
    expect(byName.taux).toMatchObject({ kind: 'number', value: 80 });
    expect(byName.note).toMatchObject({ kind: 'text', value: 'ok' });
    expect(byName.cout!.result).toEqual({ ok: true, value: 120 });
    expect(byName.ttc!.result).toEqual({ ok: true, value: 144 });
  });

  it('reports cycles instead of recursing', () => {
    const t = task({ fields: { a: '=b + 1', b: '=a + 1' } });
    for (const f of resolveFields(t)) expect(f.result).toMatchObject({ ok: false, code: 'cycle' });
  });

  it('previews an unsaved formula', () => {
    const t = task({ fields: { x: 4 } });
    expect(previewFormula(t, 'y', 'x * 2')).toEqual({ ok: true, value: 8 });
    expect(previewFormula(t, 'y', 'z * 2')).toMatchObject({
      ok: false,
      code: 'unknown-identifier',
    });
  });
});

describe('formulaError', () => {
  it('names the unknown field', () => {
    const r = previewFormula(task(), 'y', '2 * prix');
    if (r.ok) throw new Error('expected an error');
    expect(formulaError('2 * prix', r)).toEqual({
      key: 'tasks.formulas.errors.unknownField',
      vars: { name: 'prix' },
    });
  });
});

describe('field values', () => {
  it('validates names usable in formulas', () => {
    expect(isValidFieldName('taux_horaire')).toBe(true);
    expect(isValidFieldName('coût')).toBe(true);
    expect(isValidFieldName('2x')).toBe(false);
    expect(isValidFieldName('a b')).toBe(false);
  });

  it('parses inputs by kind', () => {
    expect(parseFieldValue('number', '12,5')).toBe(12.5);
    expect(parseFieldValue('number', 'abc')).toBeNull();
    expect(parseFieldValue('number', ' ')).toBeNull();
    expect(parseFieldValue('formula', ' a + 1 ')).toBe('=a + 1');
    expect(parseFieldValue('checkbox', 'true')).toBe(true);
    expect(kindOf('=1')).toBe('formula');
    expect(kindOf(false)).toBe('checkbox');
  });
});
