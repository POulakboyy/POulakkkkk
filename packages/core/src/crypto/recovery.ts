/**
 * Printable recovery keys.
 *
 * A recovery key is 256 random bits plus a 24-bit checksum (truncated SHA-256 over a domain
 * tag and the key), encoded in Crockford Base32 — no I, L, O or U, case-insensitive, `I`/`L`
 * read as `1` and `O` as `0` — and shown as 8 groups of 7 characters:
 *
 *     7K3QW2M-9XHC4RT-…-PZ8B0QF
 *
 * The checksum only catches typos; it carries no secret and gives an attacker nothing (the
 * key keeps 256 bits of entropy). Users print or store it offline: it is the only way back
 * into a vault whose passphrase is lost.
 */
import { type Bytes, concatBytes, timingSafeEqual, utf8Encode, zeroize } from './bytes.ts';
import { CryptoError } from './errors.ts';
import { randomBytes, sha256 } from './runtime.ts';

export const RECOVERY_KEY_BYTES = 32;
const CHECKSUM_BYTES = 3;
const TOTAL_BYTES = RECOVERY_KEY_BYTES + CHECKSUM_BYTES; // 280 bits = 56 base32 characters
const ENCODED_LENGTH = (TOTAL_BYTES * 8) / 5;
const GROUP_SIZE = 7;
const CHECKSUM_DOMAIN = utf8Encode('pouxis/recovery-key/v1');

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export interface RecoveryKey {
  /** Human-readable form to print or save; never stored by POuxis. */
  text: string;
  /** Raw key material; zeroize it once used. */
  bytes: Bytes;
}

export async function generateRecoveryKey(): Promise<RecoveryKey> {
  const bytes = randomBytes(RECOVERY_KEY_BYTES);
  return { text: await formatRecoveryKey(bytes), bytes };
}

export async function formatRecoveryKey(key: Uint8Array): Promise<string> {
  if (key.length !== RECOVERY_KEY_BYTES) {
    throw new CryptoError('invalid-argument', `Recovery key must be ${RECOVERY_KEY_BYTES} bytes`);
  }
  const payload = concatBytes(key, await checksum(key));
  try {
    const encoded = encodeBase32(payload);
    const groups: string[] = [];
    for (let i = 0; i < encoded.length; i += GROUP_SIZE) {
      groups.push(encoded.slice(i, i + GROUP_SIZE));
    }
    return groups.join('-');
  } finally {
    zeroize(payload);
  }
}

/**
 * Parses a recovery key typed or pasted by the user (any case, any spacing or dashes,
 * Crockford substitutions). Throws `invalid-recovery-key` on a typo.
 */
export async function parseRecoveryKey(text: string): Promise<Bytes> {
  if (typeof text !== 'string') throw invalid();
  const compact = text.replace(/[\s-]+/g, '').toUpperCase();
  if (compact.length !== ENCODED_LENGTH) throw invalid();
  const payload = decodeBase32(compact);
  const key = payload.slice(0, RECOVERY_KEY_BYTES);
  const expected = await checksum(key);
  const ok = timingSafeEqual(payload.subarray(RECOVERY_KEY_BYTES), expected);
  zeroize(payload);
  if (!ok) {
    zeroize(key);
    throw invalid();
  }
  return key;
}

async function checksum(key: Uint8Array): Promise<Bytes> {
  const input = concatBytes(CHECKSUM_DOMAIN, key);
  try {
    return (await sha256(input)).slice(0, CHECKSUM_BYTES);
  } finally {
    zeroize(input);
  }
}

function encodeBase32(bytes: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += CROCKFORD.charAt((buffer >>> bits) & 31);
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) out += CROCKFORD.charAt((buffer << (5 - bits)) & 31);
  return out;
}

function decodeBase32(text: string): Bytes {
  const out = new Uint8Array(Math.floor((text.length * 5) / 8));
  let buffer = 0;
  let bits = 0;
  let offset = 0;
  for (const char of text) {
    const value = CROCKFORD.indexOf(char === 'O' ? '0' : char === 'I' || char === 'L' ? '1' : char);
    if (value < 0) throw invalid();
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out[offset++] = (buffer >>> bits) & 0xff;
    }
    buffer &= (1 << bits) - 1;
  }
  return out;
}

function invalid(): CryptoError {
  return new CryptoError('invalid-recovery-key', 'Invalid recovery key (check for typos)');
}
