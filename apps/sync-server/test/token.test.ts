import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { authorize, parseCliArgs, parseDuration, signToken, verifyToken } from '../src/token.ts';

const SECRET = 'a-very-long-test-secret-for-hmac-signing-0001';
const OTHER = 'another-very-long-test-secret-for-hmac-0002';
const NOW = 1_800_000_000;

function mint(options: { space?: string; exp?: number; node?: string } = {}, secret = SECRET) {
  const sign: { space: string; exp: number; node?: string; iat: number } = {
    space: options.space ?? 'space-1',
    exp: options.exp ?? NOW + 60,
    iat: NOW,
  };
  if (options.node !== undefined) sign.node = options.node;
  return signToken(sign, secret);
}

describe('signToken / verifyToken', () => {
  it('round-trips claims', () => {
    const result = verifyToken(mint({ node: 'node-a' }), [SECRET], NOW);
    expect(result).toEqual({
      ok: true,
      claims: { v: 1, space: 'space-1', exp: NOW + 60, iat: NOW, node: 'node-a' },
    });
  });

  it('rejects expired tokens (exp is exclusive)', () => {
    const token = mint({ exp: NOW });
    expect(verifyToken(token, [SECRET], NOW)).toEqual({ ok: false, reason: 'expired' });
    expect(verifyToken(token, [SECRET], NOW - 1).ok).toBe(true);
  });

  it('rejects a token signed with another secret', () => {
    expect(verifyToken(mint({}, OTHER), [SECRET], NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('accepts any configured secret (rotation)', () => {
    expect(verifyToken(mint({}, OTHER), [SECRET, OTHER], NOW).ok).toBe(true);
  });

  it('rejects tampered claims', () => {
    const [claims, mac] = mint().split('.') as [string, string];
    const forged = Buffer.from(
      JSON.stringify({ v: 1, space: 'space-2', exp: NOW + 60 }),
      'utf8',
    ).toString('base64url');
    expect(verifyToken(`${forged}.${mac}`, [SECRET], NOW).ok).toBe(false);
    expect(verifyToken(`${claims}.${mac.slice(0, -2)}AA`, [SECRET], NOW).ok).toBe(false);
  });

  it.each(['', 'abc', 'a.b.c', '.abc', 'abc.', 'ab$.cd', `x.${'A'.repeat(43)}`])(
    'rejects malformed token %j',
    (token) => {
      const result = verifyToken(token, [SECRET], NOW);
      expect(result.ok).toBe(false);
    },
  );

  it.each([
    { v: 2, space: 's', exp: NOW + 1 },
    { v: 1, space: 'has space', exp: NOW + 1 },
    { v: 1, space: 's', exp: '1' },
    ['not', 'an', 'object'],
  ])('rejects well-signed but invalid claims %j', (claims) => {
    const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const mac = createHmac('sha256', SECRET)
      .update('pouxis-sync-token.v1.' + encoded)
      .digest('base64url');
    expect(verifyToken(`${encoded}.${mac}`, [SECRET], NOW)).toEqual({
      ok: false,
      reason: 'bad_claims',
    });
  });

  it('refuses to sign invalid input', () => {
    expect(() => signToken({ space: 'has space', exp: NOW }, SECRET)).toThrow();
    expect(() => signToken({ space: 's', exp: 1.5 }, SECRET)).toThrow();
    expect(() => signToken({ space: 's', exp: NOW, node: '' }, SECRET)).toThrow();
    expect(() => signToken({ space: 's', exp: NOW }, '')).toThrow();
  });
});

describe('authorize', () => {
  it('checks the space', () => {
    expect(authorize(mint(), 'space-2', 'node-a', [SECRET], NOW)).toEqual({
      ok: false,
      reason: 'wrong_space',
    });
  });

  it('checks the node only when the token is bound', () => {
    expect(authorize(mint(), 'space-1', 'any-node', [SECRET], NOW).ok).toBe(true);
    const bound = mint({ node: 'node-a' });
    expect(authorize(bound, 'space-1', 'node-a', [SECRET], NOW).ok).toBe(true);
    expect(authorize(bound, 'space-1', 'node-b', [SECRET], NOW)).toEqual({
      ok: false,
      reason: 'wrong_node',
    });
  });
});

describe('parseDuration', () => {
  it.each([
    ['3600', 3600],
    ['90s', 90],
    ['15m', 900],
    ['12h', 43200],
    ['30d', 2_592_000],
  ])('parses %s', (text, seconds) => {
    expect(parseDuration(text)).toBe(seconds);
  });

  it.each(['', '0', '-1', '1w', '1.5h', 'abc'])('rejects %j', (text) => {
    expect(parseDuration(text)).toBeUndefined();
  });
});

describe('parseCliArgs', () => {
  it('parses options with a default ttl', () => {
    expect(parseCliArgs(['--space', 's1'])).toEqual({ space: 's1', ttl: 30 * 86400 });
    expect(parseCliArgs(['--space', 's1', '--node', 'n1', '--ttl', '1h'])).toEqual({
      space: 's1',
      node: 'n1',
      ttl: 3600,
    });
  });

  it('reports usage errors', () => {
    expect(typeof parseCliArgs([])).toBe('string');
    expect(typeof parseCliArgs(['--space'])).toBe('string');
    expect(typeof parseCliArgs(['--space', 's', '--ttl', 'soon'])).toBe('string');
    expect(typeof parseCliArgs(['--space', 's', '--bogus', 'x'])).toBe('string');
  });
});
