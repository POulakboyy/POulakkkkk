import { afterEach, describe, expect, it } from 'vitest';
import { DISABLED_KEY, disabledFeatures, parseDisabled, setFeatureEnabled } from './toggles.ts';

afterEach(() => localStorage.clear());

describe('lab toggles', () => {
  it('parses only arrays of strings', () => {
    expect([...parseDisabled('["a",1,"b"]')]).toEqual(['a', 'b']);
    expect(parseDisabled('{oops').size).toBe(0);
    expect(parseDisabled('"a"').size).toBe(0);
    expect(parseDisabled(null).size).toBe(0);
  });

  it('persists switched-off features and keeps a stable snapshot', () => {
    expect(disabledFeatures().size).toBe(0);
    setFeatureEnabled('wins', false);
    setFeatureEnabled('breaks', false);
    expect(localStorage.getItem(DISABLED_KEY)).toBe('["breaks","wins"]');
    expect(disabledFeatures()).toBe(disabledFeatures());
    setFeatureEnabled('wins', true);
    expect([...disabledFeatures()]).toEqual(['breaks']);
  });
});
