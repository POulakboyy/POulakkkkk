import { describe, expect, it } from 'vitest';
import { toHex } from './bytes.ts';
import {
  RECOVERY_KEY_BYTES,
  formatRecoveryKey,
  generateRecoveryKey,
  parseRecoveryKey,
} from './recovery.ts';

const FORMAT = /^[0-9A-HJKMNP-TV-Z]{7}(-[0-9A-HJKMNP-TV-Z]{7}){7}$/;

async function failureCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

/** Replaces the character at `index` with a different valid Crockford character. */
function typo(text: string, index: number): string {
  const replacement = text[index] === 'A' ? 'B' : 'A';
  return text.slice(0, index) + replacement + text.slice(index + 1);
}

describe('recovery keys', () => {
  it('prints 256 bits + checksum as 8 groups of 7 Crockford characters', async () => {
    const { text, bytes } = await generateRecoveryKey();
    expect(bytes.length).toBe(RECOVERY_KEY_BYTES);
    expect(text).toMatch(FORMAT);
    expect(toHex(await parseRecoveryKey(text))).toBe(toHex(bytes));
  });

  it('is deterministic for given key bytes', async () => {
    const bytes = new Uint8Array(32).map((_, i) => i);
    expect(await formatRecoveryKey(bytes)).toBe(await formatRecoveryKey(bytes));
  });

  it('accepts lowercase, spaces and Crockford look-alikes', async () => {
    const bytes = new Uint8Array(32); // encodes as a run of zeros, then the checksum
    const text = await formatRecoveryKey(bytes);
    expect(text.startsWith('0000000-0000000')).toBe(true);
    const sloppy = ` ${text.replace('0000000-0000000', 'OoOoOoO 0000000').toLowerCase()} `;
    expect(await parseRecoveryKey(sloppy)).toEqual(bytes);

    const ones = new Uint8Array(32).fill(0x08); // 00001000… yields '1' digits
    const withOnes = await formatRecoveryKey(ones);
    expect(withOnes).toContain('1');
    expect(await parseRecoveryKey(withOnes.replaceAll('1', 'l'))).toEqual(ones);
    expect(await parseRecoveryKey(withOnes.replaceAll('1', 'I'))).toEqual(ones);
  });

  it('detects typos through the checksum', async () => {
    const { text } = await generateRecoveryKey();
    for (const index of [0, 9, 30, text.length - 1]) {
      expect(await failureCode(parseRecoveryKey(typo(text, index)))).toBe('invalid-recovery-key');
    }
  });

  it('rejects wrong lengths and characters outside the alphabet', async () => {
    const { text } = await generateRecoveryKey();
    expect(await failureCode(parseRecoveryKey(text.slice(0, -1)))).toBe('invalid-recovery-key');
    expect(await failureCode(parseRecoveryKey(`${text}A`))).toBe('invalid-recovery-key');
    expect(await failureCode(parseRecoveryKey(`U${text.slice(1)}`))).toBe('invalid-recovery-key');
    expect(await failureCode(parseRecoveryKey(''))).toBe('invalid-recovery-key');
  });

  it('refuses keys of the wrong size', async () => {
    expect(await failureCode(formatRecoveryKey(new Uint8Array(16)))).toBe('invalid-argument');
  });
});
