import { beforeAll, describe, expect, it } from 'vitest';
import { toBase64Url, utf8Decode, utf8Encode } from './bytes.ts';
import {
  type ShareLink,
  type ShareSigningKey,
  type ShareTokenClaims,
  createShareLink,
  decodeShareToken,
  decryptSharedContent,
  encryptSharedContent,
  generateShareSigningKey,
  importShareSigningKey,
  parseShareUrl,
  signShareToken,
  unlockShare,
  verifySharePassword,
  verifyShareToken,
} from './share.ts';

const SLOW = 60_000;
const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const BASE_URL = 'https://share.example';

async function failureCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

let signer: ShareSigningKey;
let keyring: Map<string, CryptoKey>;

beforeAll(async () => {
  signer = { kid: 'k1', key: await generateShareSigningKey() };
  keyring = new Map([['k1', signer.key]]);
});

function link(overrides: { permission?: 'read' | 'comment'; password?: string } = {}) {
  return createShareLink({
    baseUrl: BASE_URL,
    resourceId: 'note-42',
    permission: overrides.permission ?? 'read',
    expiresAt: NOW + 7 * DAY,
    signer,
    now: NOW,
    ...(overrides.password === undefined ? {} : { password: overrides.password }),
  });
}

describe('createShareLink', () => {
  it('keeps the content key in the fragment and signed claims in the path', async () => {
    const share = await link();
    const { token, secret } = parseShareUrl(share.url);
    expect(share.url.startsWith(`${BASE_URL}/s/pxs1.k1.`)).toBe(true);
    expect(token).toBe(share.token);
    expect(token).not.toContain(secret);
    expect(decodeShareToken(token)).toEqual(share.claims);
    expect(share.claims).toMatchObject({ rid: 'note-42', perm: 'read', iat: NOW });
  });

  it('lets a viewer holding the URL decrypt the snapshot', async () => {
    const share = await link();
    const envelope = await encryptSharedContent(share.contentKey, share.claims, 'Bonjour');
    const { secret, token } = parseShareUrl(share.url);
    const { contentKey } = await unlockShare({ secret, claims: decodeShareToken(token) });
    expect(utf8Decode(await decryptSharedContent(contentKey, share.claims, envelope))).toBe(
      'Bonjour',
    );
  });

  it('binds content to its part and to the link', async () => {
    const share = await link();
    const other = await link();
    const envelope = await encryptSharedContent(share.contentKey, share.claims, 'x');
    expect(
      await failureCode(
        decryptSharedContent(share.contentKey, share.claims, envelope, 'comment:1'),
      ),
    ).toBe('decrypt-failed');
    expect(await failureCode(decryptSharedContent(share.contentKey, other.claims, envelope))).toBe(
      'decrypt-failed',
    );
  });

  it('refuses insecure base URLs, past expiries and excessive lifetimes', async () => {
    const base = {
      resourceId: 'r',
      permission: 'read' as const,
      signer,
      now: NOW,
    };
    for (const options of [
      { ...base, baseUrl: 'http://share.example', expiresAt: NOW + DAY },
      { ...base, baseUrl: `${BASE_URL}/?q=1`, expiresAt: NOW + DAY },
      { ...base, baseUrl: BASE_URL, expiresAt: NOW },
      { ...base, baseUrl: BASE_URL, expiresAt: NOW + 400 * DAY },
    ]) {
      expect(await failureCode(createShareLink(options))).toBe('invalid-argument');
    }
    const local = await createShareLink({
      ...base,
      baseUrl: 'http://localhost:8787/',
      expiresAt: NOW + DAY,
    });
    expect(local.url.startsWith('http://localhost:8787/s/')).toBe(true);
  });

  it('rejects a remote signer that widens the requested claims', async () => {
    const widening = async (claims: ShareTokenClaims) =>
      signShareToken({ ...claims, perm: 'comment' }, signer);
    expect(
      await failureCode(
        createShareLink({
          baseUrl: BASE_URL,
          resourceId: 'r',
          permission: 'read',
          expiresAt: NOW + DAY,
          signer: widening,
          now: NOW,
        }),
      ),
    ).toBe('invalid-argument');
  });
});

describe('verifyShareToken', () => {
  let share: ShareLink;
  beforeAll(async () => {
    share = await link({ permission: 'comment' });
  });

  it('accepts a valid token', async () => {
    const result = await verifyShareToken(share.token, keyring, {
      now: NOW + DAY,
      require: 'read',
      resourceId: 'note-42',
    });
    expect(result).toEqual({ ok: true, kid: 'k1', claims: share.claims });
  });

  it('checks expiry, clock skew, permission, resource and revocation', async () => {
    const reasons = await Promise.all([
      verifyShareToken(share.token, keyring, { now: share.claims.exp }),
      verifyShareToken(share.token, keyring, { now: NOW - 5 * 60_000 }),
      verifyShareToken((await link()).token, keyring, { now: NOW, require: 'comment' }),
      verifyShareToken(share.token, keyring, { now: NOW, resourceId: 'note-43' }),
      verifyShareToken(share.token, keyring, {
        now: NOW,
        isRevoked: (lid) => lid === share.claims.lid,
      }),
    ]);
    expect(reasons.map((r) => (r.ok ? 'ok' : r.reason))).toEqual([
      'expired',
      'not-yet-valid',
      'insufficient-permission',
      'wrong-resource',
      'revoked',
    ]);
  });

  it('rejects tampered claims, foreign keys and garbage', async () => {
    const [prefix, kid, , mac] = share.token.split('.');
    const forgedClaims = toBase64Url(
      utf8Encode(JSON.stringify({ ...share.claims, exp: share.claims.exp + 365 * DAY })),
    );
    const forged = [prefix, kid, forgedClaims, mac].join('.');
    const foreign = new Map([['k1', await generateShareSigningKey()]]);
    const results = await Promise.all([
      verifyShareToken(forged, keyring, { now: NOW }),
      verifyShareToken(share.token, foreign, { now: NOW }),
      verifyShareToken(share.token, new Map(), { now: NOW }),
      verifyShareToken('pxs1.k1.e30', keyring, { now: NOW }),
      verifyShareToken('not a token', keyring, { now: NOW }),
    ]);
    expect(results.map((r) => (r.ok ? 'ok' : r.reason))).toEqual([
      'bad-signature',
      'bad-signature',
      'unknown-key',
      'malformed',
      'malformed',
    ]);
  });

  it('supports key lookup functions and imported keys (rotation)', async () => {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const imported = { kid: 'k2', key: await importShareSigningKey(raw) };
    const token = await signShareToken(share.claims, imported);
    const lookup = async (id: string) => (id === 'k2' ? importShareSigningKey(raw) : undefined);
    expect((await verifyShareToken(token, lookup, { now: NOW })).ok).toBe(true);
    await expect(importShareSigningKey(new Uint8Array(16))).rejects.toThrow();
  });
});

describe('password-protected links', () => {
  it(
    'requires the password to derive the key and proves it to the server',
    async () => {
      const share = await link({ password: 'mot de passe partagé' });
      expect(share.claims.pw).toBeDefined();
      expect(share.passwordRecord).toBeDefined();
      const record = share.passwordRecord ?? { v: 1 as const, hash: '' };
      const { secret } = parseShareUrl(share.url);
      const envelope = await encryptSharedContent(share.contentKey, share.claims, 'privé');

      expect(await failureCode(unlockShare({ secret, claims: share.claims }))).toBe(
        'password-required',
      );

      const good = await unlockShare({
        secret,
        claims: share.claims,
        password: 'mot de passe partagé',
      });
      expect(await verifySharePassword(good.passwordProof ?? '', record)).toBe(true);
      expect(utf8Decode(await decryptSharedContent(good.contentKey, share.claims, envelope))).toBe(
        'privé',
      );

      const bad = await unlockShare({
        secret,
        claims: share.claims,
        password: 'mauvais mot de passe',
      });
      expect(await verifySharePassword(bad.passwordProof ?? '', record)).toBe(false);
      expect(await failureCode(decryptSharedContent(bad.contentKey, share.claims, envelope))).toBe(
        'decrypt-failed',
      );
      expect(await verifySharePassword('garbage', record)).toBe(false);
    },
    SLOW,
  );

  it('enforces a minimum password length', async () => {
    expect(await failureCode(link({ password: 'court' }))).toBe('invalid-argument');
  });
});
