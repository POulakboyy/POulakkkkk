import { describe, expect, it } from 'vitest';
import {
  concatBytes,
  fromBase64Url,
  fromBase64UrlExact,
  fromHex,
  timingSafeEqual,
  toBase64Url,
  toHex,
  utf8Decode,
  utf8Encode,
  zeroize,
} from './bytes.ts';
import { isCryptoError } from './errors.ts';
import { randomBytes } from './runtime.ts';

describe('base64url', () => {
  // RFC 4648 §10 test vectors, unpadded.
  const vectors: [string, string][] = [
    ['', ''],
    ['f', 'Zg'],
    ['fo', 'Zm8'],
    ['foo', 'Zm9v'],
    ['foob', 'Zm9vYg'],
    ['fooba', 'Zm9vYmE'],
    ['foobar', 'Zm9vYmFy'],
  ];

  it.each(vectors)('encodes and decodes %j', (text, encoded) => {
    expect(toBase64Url(utf8Encode(text))).toBe(encoded);
    expect(utf8Decode(fromBase64Url(encoded))).toBe(text);
  });

  it('uses the URL-safe alphabet', () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xbf]);
    expect(toBase64Url(bytes)).toBe('-_-_');
    expect(fromBase64Url('-_-_')).toEqual(bytes);
  });

  it('round-trips random data of every length modulo 3', () => {
    for (let length = 0; length < 70; length++) {
      const bytes = randomBytes(length);
      expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
    }
  });

  it.each([
    ['padding', 'Zg=='],
    ['standard alphabet', 'a+/b'],
    ['whitespace', 'Zm9v Yg'],
    ['impossible length', 'Zm9vY'],
    ['non-canonical trailing bits', 'Zh'],
    ['non-ASCII', 'Zm9é'],
  ])('rejects %s', (_label, text) => {
    expect(() => fromBase64Url(text)).toThrow(expect.objectContaining({ code: 'malformed' }));
  });

  it('checks exact decoded lengths', () => {
    expect(fromBase64UrlExact('Zm9v', 3, 'x')).toEqual(utf8Encode('foo'));
    expect(() => fromBase64UrlExact('Zm9v', 4, 'x')).toThrow(/4 bytes/);
  });
});

describe('hex', () => {
  it('round-trips lowercase hex', () => {
    const bytes = new Uint8Array([0, 1, 0x7f, 0x80, 0xff]);
    expect(toHex(bytes)).toBe('00017f80ff');
    expect(fromHex('00017f80ff')).toEqual(bytes);
  });

  it.each(['abc', 'ABCD', '0g'])('rejects %j', (text) => {
    expect(() => fromHex(text)).toThrow(expect.objectContaining({ code: 'malformed' }));
  });
});

describe('utf8', () => {
  it('decodes strictly', () => {
    expect(utf8Decode(utf8Encode('POuxis ✓ 🔐'))).toBe('POuxis ✓ 🔐');
    let error: unknown;
    try {
      utf8Decode(new Uint8Array([0xc3, 0x28]));
    } catch (caught) {
      error = caught;
    }
    expect(isCryptoError(error, 'malformed')).toBe(true);
  });
});

describe('timingSafeEqual', () => {
  it('compares contents and lengths', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
    expect(timingSafeEqual(new Uint8Array(0), new Uint8Array(0))).toBe(true);
  });
});

describe('helpers', () => {
  it('concatenates and zeroizes', () => {
    const joined = concatBytes(new Uint8Array([1]), new Uint8Array([2, 3]));
    expect(joined).toEqual(new Uint8Array([1, 2, 3]));
    zeroize(joined, undefined);
    expect(joined).toEqual(new Uint8Array(3));
  });

  it('draws random bytes beyond the 64 KiB getRandomValues limit', () => {
    const bytes = randomBytes(70_000);
    expect(bytes.length).toBe(70_000);
    expect(bytes.subarray(65_536).some((byte) => byte !== 0)).toBe(true);
    expect(() => randomBytes(-1)).toThrow(expect.objectContaining({ code: 'invalid-argument' }));
  });
});
