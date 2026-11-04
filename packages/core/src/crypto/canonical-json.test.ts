import { describe, expect, it } from 'vitest';
import { canonicalJson } from './canonical-json.ts';

describe('canonicalJson (RFC 8785)', () => {
  it('sorts members by UTF-16 code units (RFC 8785 §3.2.3 example)', () => {
    const value = {
      '€': 'Euro Sign',
      '\r': 'Carriage Return',
      'דּ': 'Hebrew Letter Dalet With Dagesh',
      '1': 'One',
      '😀': 'Emoji: Grinning Face',
      '\u0080': 'Control',
      'ö': 'Latin Small Letter O With Diaeresis',
    };
    const keys = Object.keys(JSON.parse(canonicalJson(value)) as object);
    expect(keys).toEqual(['\r', '1', '\u0080', 'ö', '€', '😀', 'דּ']);
  });

  it('emits no whitespace and sorts nested objects', () => {
    expect(canonicalJson({ b: [3, { d: 1, c: null }], a: true })).toBe(
      '{"a":true,"b":[3,{"c":null,"d":1}]}',
    );
  });

  it('serializes numbers like ECMAScript', () => {
    expect(canonicalJson([-0, 1e21, 1e-7, 0.000001, 333333333.3333333, 1e300])).toBe(
      '[0,1e+21,1e-7,0.000001,333333333.3333333,1e+300]',
    );
  });

  it('escapes strings minimally', () => {
    expect(canonicalJson('"\\\n\u0001é€')).toBe('"\\"\\\\\\n\\u0001é€"');
  });

  it('omits undefined members, so absent and undefined optionals hash alike', () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe(canonicalJson({ a: 1 }));
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['lone surrogate', '\ud800'],
    ['lone surrogate key', { '\udc00': 1 }],
    ['undefined in an array', [1, undefined]],
    ['Date', new Date(0)],
    ['Map', new Map()],
    ['bigint', 1n],
    ['function', () => 1],
  ])('rejects %s', (_label, value) => {
    expect(() => canonicalJson(value)).toThrow(
      expect.objectContaining({ code: 'invalid-argument' }),
    );
  });

  it('rejects cycles instead of overflowing the stack', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => canonicalJson(cyclic)).toThrow(/too deep/);
  });

  it('accepts null-prototype objects', () => {
    const bare = Object.create(null) as Record<string, number>;
    bare.z = 1;
    bare.a = 2;
    expect(canonicalJson(bare)).toBe('{"a":2,"z":1}');
  });
});
