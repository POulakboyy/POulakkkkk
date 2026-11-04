import { describe, expect, it } from 'vitest';
import { generateVaultKey } from './aead.ts';
import { fromBase64Url } from './bytes.ts';
import { type PayloadContext, decryptPayload, encryptPayload, padme } from './payload.ts';

const CONTEXT: PayloadContext = {
  spaceId: 'space-1',
  id: 'env-1',
  hlc: { ts: 1_700_000_000_000, counter: 3 },
  node: 'device-a',
};

async function failureCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

function ciphertextLength(envelope: string): number {
  return fromBase64Url(envelope.split('.')[2] ?? '').length;
}

describe('encryptPayload / decryptPayload', () => {
  it('round-trips JSON payloads', async () => {
    const key = await generateVaultKey();
    const payload = { op: 'set', path: ['title'], value: 'Écrire le brief ✍️', n: [1, null] };
    const sealed = await encryptPayload(key, payload, CONTEXT);
    expect(sealed.startsWith('pxv1.')).toBe(true);
    expect(sealed).not.toContain('brief');
    expect(await decryptPayload(key, sealed, CONTEXT)).toEqual(payload);
  });

  it('fails when any metadata field differs (no replay into another context)', async () => {
    const key = await generateVaultKey();
    const sealed = await encryptPayload(key, { op: 'delete' }, CONTEXT);
    const variants: PayloadContext[] = [
      { ...CONTEXT, spaceId: 'space-2' },
      { ...CONTEXT, id: 'env-2' },
      { ...CONTEXT, hlc: { ts: 1_700_000_000_000, counter: 4 } },
      { ...CONTEXT, node: 'device-b' },
    ];
    for (const context of variants) {
      expect(await failureCode(decryptPayload(key, sealed, context))).toBe('decrypt-failed');
    }
    expect(await failureCode(decryptPayload(await generateVaultKey(), sealed, CONTEXT))).toBe(
      'decrypt-failed',
    );
  });

  it('hides exact sizes with Padmé padding unless disabled', async () => {
    const key = await generateVaultKey();
    const lengths = new Set<number>();
    for (let size = 1000; size < 1030; size++) {
      lengths.add(ciphertextLength(await encryptPayload(key, 'x'.repeat(size), CONTEXT)));
    }
    expect(lengths.size).toBeLessThan(5);
    const unpadded = await encryptPayload(key, 'x'.repeat(1000), CONTEXT, { pad: false });
    // 5-byte frame header + JSON string (quotes included) + 16-byte tag.
    expect(ciphertextLength(unpadded)).toBe(5 + 1002 + 16);
    expect(await decryptPayload(key, unpadded, CONTEXT)).toBe('x'.repeat(1000));
  });

  it('rejects values that are not JSON and incomplete contexts', async () => {
    const key = await generateVaultKey();
    expect(await failureCode(encryptPayload(key, undefined, CONTEXT))).toBe('invalid-argument');
    expect(await failureCode(encryptPayload(key, {}, { ...CONTEXT, node: '' }))).toBe(
      'invalid-argument',
    );
  });
});

describe('padme', () => {
  it('rounds lengths up to the Padmé grid', () => {
    expect([0, 1, 2, 3, 9, 100, 1000, 1025].map(padme)).toEqual([0, 1, 2, 3, 10, 104, 1024, 1088]);
  });

  it('never shrinks and wastes at most ~12 % for large inputs', () => {
    for (let length = 2; length < 5000; length += 7) {
      const padded = padme(length);
      expect(padded).toBeGreaterThanOrEqual(length);
      if (length > 256) expect(padded / length).toBeLessThan(1.12);
    }
  });

  it('rejects invalid lengths', () => {
    expect(() => padme(-1)).toThrow();
    expect(() => padme(1.5)).toThrow();
  });
});
