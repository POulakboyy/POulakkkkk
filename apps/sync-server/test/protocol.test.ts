import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIMITS,
  encodeCursor,
  encodeServerMessage,
  parseClientMessage,
  parseCursor,
  validateClientMessage,
  type ParseResult,
} from '../src/protocol.ts';

const hello = { t: 'hello', space: 'space-1', node: 'node-a', since: null, token: 'abc.def' };
const env = { id: 'op-1', hlc: '1700000000000-0-node-a', node: 'node-a', payload: 'pxv1.cipher' };

function error(result: ParseResult): string {
  if (result.ok) throw new Error('expected a validation failure');
  return result.error;
}

describe('parseClientMessage', () => {
  it('accepts a valid hello, with null or cursor since', () => {
    expect(parseClientMessage(JSON.stringify(hello))).toEqual({ ok: true, message: hello });
    const resumed = { ...hello, since: '42' };
    expect(parseClientMessage(JSON.stringify(resumed))).toEqual({ ok: true, message: resumed });
  });

  it('accepts a valid push, including an empty one', () => {
    const push = { t: 'push', envelopes: [env] };
    expect(parseClientMessage(JSON.stringify(push))).toEqual({ ok: true, message: push });
    expect(parseClientMessage('{"t":"push","envelopes":[]}').ok).toBe(true);
  });

  it('rejects invalid JSON and non-object messages', () => {
    expect(error(parseClientMessage('{'))).toMatch(/JSON/);
    for (const raw of ['null', '[]', '"hello"', '42']) {
      expect(error(parseClientMessage(raw))).toMatch(/object/);
    }
  });

  it('rejects unknown message types', () => {
    expect(error(parseClientMessage('{"t":"ops","envelopes":[]}'))).toMatch(/unknown message type/);
    expect(error(parseClientMessage('{}'))).toMatch(/unknown message type/);
  });

  it('rejects unknown and missing fields, including __proto__', () => {
    expect(error(validateClientMessage({ ...hello, extra: 1 }))).toMatch(/unknown field "extra"/);
    const { token: _token, ...noToken } = hello;
    expect(error(validateClientMessage(noToken))).toBe('token: missing');
    const polluted = `{"t":"push","envelopes":[],"__proto__":{"admin":true}}`;
    expect(error(parseClientMessage(polluted))).toMatch(/unknown field "__proto__"/);
    const envPolluted = { t: 'push', envelopes: [{ ...env, seq: 3 }] };
    expect(error(validateClientMessage(envPolluted))).toMatch(
      /envelopes\[0\]\.unknown field "seq"/,
    );
  });

  it('rejects malformed identifiers', () => {
    const bad = [
      '',
      'has space',
      'tab\there',
      'nul\u0000',
      'é',
      'x'.repeat(DEFAULT_LIMITS.maxIdLength + 1),
      7,
    ];
    for (const space of bad) {
      expect(error(validateClientMessage({ ...hello, space }))).toBe('space: invalid identifier');
    }
    expect(error(validateClientMessage({ ...hello, node: null }))).toBe('node: invalid identifier');
    expect(
      validateClientMessage({ ...hello, space: 'x'.repeat(DEFAULT_LIMITS.maxIdLength) }).ok,
    ).toBe(true);
  });

  it('rejects malformed cursors in since', () => {
    for (const since of ['', '-1', '01', '1.5', 'abc', '99999999999999999', 5, false]) {
      expect(error(validateClientMessage({ ...hello, since }))).toMatch(/^since:/);
    }
  });

  it('rejects malformed tokens', () => {
    for (const token of [
      '',
      'has space',
      'a+b/c=',
      'x'.repeat(DEFAULT_LIMITS.maxTokenLength + 1),
      1,
    ]) {
      expect(error(validateClientMessage({ ...hello, token }))).toBe('token: invalid format');
    }
  });

  it('validates every envelope field and reports its index', () => {
    const push = (e: unknown) => ({ t: 'push', envelopes: [env, e] });
    expect(error(validateClientMessage(push('x')))).toBe('envelopes[1].envelope must be an object');
    expect(error(validateClientMessage(push({ ...env, id: '' })))).toBe(
      'envelopes[1].id: invalid identifier',
    );
    expect(error(validateClientMessage(push({ ...env, hlc: 'a b' })))).toBe(
      'envelopes[1].hlc: invalid identifier',
    );
    expect(error(validateClientMessage(push({ ...env, node: 1 })))).toBe(
      'envelopes[1].node: invalid identifier',
    );
    expect(error(validateClientMessage(push({ ...env, payload: {} })))).toBe(
      'envelopes[1].payload: must be a string',
    );
    expect(error(validateClientMessage({ t: 'push', envelopes: {} }))).toBe(
      'envelopes: must be an array',
    );
  });

  it('limits payload size in UTF-8 bytes, not characters', () => {
    const limits = { ...DEFAULT_LIMITS, maxPayloadBytes: 8 };
    const push = (payload: string) => ({ t: 'push', envelopes: [{ ...env, payload }] });
    expect(validateClientMessage(push('12345678'), limits).ok).toBe(true);
    expect(error(validateClientMessage(push('123456789'), limits))).toMatch(/exceeds 8 bytes/);
    // 3 characters, 9 bytes.
    expect(error(validateClientMessage(push('€€€'), limits))).toMatch(/exceeds 8 bytes/);
  });

  it('limits the number of envelopes per push', () => {
    const limits = { ...DEFAULT_LIMITS, maxEnvelopesPerPush: 2 };
    const envelopes = [env, { ...env, id: 'op-2' }, { ...env, id: 'op-3' }];
    expect(error(validateClientMessage({ t: 'push', envelopes }, limits))).toMatch(/at most 2/);
  });

  it('copies only validated fields', () => {
    const result = validateClientMessage({ t: 'push', envelopes: [env] });
    if (!result.ok || result.message.t !== 'push') throw new Error('expected push');
    expect(result.message.envelopes[0]).not.toBe(env);
    expect(Object.keys(result.message.envelopes[0] ?? {}).sort()).toEqual([
      'hlc',
      'id',
      'node',
      'payload',
    ]);
  });
});

describe('cursors', () => {
  it('round-trips seq values', () => {
    expect(parseCursor(null)).toBe(0);
    expect(parseCursor(encodeCursor(0))).toBe(0);
    expect(parseCursor(encodeCursor(123456))).toBe(123456);
    expect(parseCursor(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('refuses out-of-range and malformed cursors', () => {
    expect(parseCursor('9007199254740993')).toBeUndefined();
    expect(parseCursor('1e3')).toBeUndefined();
    expect(parseCursor(' 1')).toBeUndefined();
  });
});

describe('encodeServerMessage', () => {
  it('serializes the exact wire shape', () => {
    expect(encodeServerMessage({ t: 'ack', ids: ['a'], cursor: '3' })).toBe(
      '{"t":"ack","ids":["a"],"cursor":"3"}',
    );
    expect(
      JSON.parse(encodeServerMessage({ t: 'ops', envelopes: [{ ...env, seq: 1 }], cursor: '1' })),
    ).toEqual({ t: 'ops', envelopes: [{ ...env, seq: 1 }], cursor: '1' });
  });
});
