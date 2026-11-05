import { describe, expect, it } from 'vitest';
import { isSyncError } from './errors.ts';
import { int, prng } from './test-utils.ts';
import { applyTextPatch, diffText } from './text.ts';

function mutate(random: () => number, text: string): string {
  let out = text;
  const edits = 1 + int(random, 6);
  for (let i = 0; i < edits; i++) {
    const at = int(random, out.length + 1);
    const kind = int(random, 3);
    const chunk = 'abcdé✓🙂\n '.slice(int(random, 5), 5 + int(random, 5));
    if (kind === 0) out = out.slice(0, at) + chunk + out.slice(at);
    else if (kind === 1) out = out.slice(0, at) + out.slice(at + int(random, 8));
    else out = out.slice(0, at) + chunk + out.slice(at + int(random, 4));
  }
  return out;
}

describe('diffText / applyTextPatch', () => {
  it('round-trips random edits (including astral characters and newlines)', () => {
    const random = prng(5);
    let base = 'Bonjour le monde ✓ — une note 🙂 avec\nplusieurs lignes.';
    for (let i = 0; i < 500; i++) {
      const target = mutate(random, base);
      expect(applyTextPatch(base, diffText(base, target))).toBe(target);
      base = target;
    }
  });

  it('is compact for small edits in long texts', () => {
    const base = 'lorem ipsum dolor sit amet '.repeat(200);
    const target = base.slice(0, 2000) + 'NEW' + base.slice(2005);
    const patch = diffText(base, target);
    expect(JSON.stringify(patch).length).toBeLessThan(40);
    expect(applyTextPatch(base, patch)).toBe(target);
  });

  it('finds a minimal script inside the trimmed middle', () => {
    // "abcabba" → "cbabac" has an edit distance (insert/delete) of 5.
    const patch = diffText('abcabba', 'cbabac');
    const edits = patch.reduce<number>(
      (sum, step) => sum + (typeof step === 'string' ? step.length : step < 0 ? -step : 0),
      0,
    );
    expect(edits).toBe(5);
    expect(applyTextPatch('abcabba', patch)).toBe('cbabac');
  });

  it('falls back to a middle replacement beyond maxEdits', () => {
    const base = 'x' + 'ab'.repeat(50) + 'y';
    const target = 'x' + 'ba'.repeat(50) + 'z';
    const patch = diffText(base, target, { maxEdits: 2 });
    expect(patch).toEqual([1, -(base.length - 1), target.slice(1)]);
    expect(applyTextPatch(base, patch)).toBe(target);
  });

  it('handles identical, empty and full replacement inputs', () => {
    expect(diffText('', '')).toEqual([]);
    expect(diffText('same', 'same')).toEqual([4]);
    expect(applyTextPatch('', diffText('', 'new'))).toBe('new');
    expect(applyTextPatch('old', diffText('old', ''))).toBe('');
  });

  it('rejects patches that do not fit the base text', () => {
    const patch = diffText('hello world', 'hello there');
    for (const base of ['hello', 'hello world!!']) {
      try {
        applyTextPatch(base, patch);
        expect.unreachable();
      } catch (error) {
        expect(isSyncError(error, 'patch-mismatch')).toBe(true);
      }
    }
    expect(() => applyTextPatch('abc', [1.5 as number])).toThrow();
    expect(() => applyTextPatch('abc', [0])).toThrow();
  });
});
