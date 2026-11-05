/**
 * Canonical JSON serialization following the JSON Canonicalization Scheme (RFC 8785, JCS):
 * object members sorted by UTF-16 code units, no whitespace, ECMAScript number and string
 * serialization. Used wherever bytes are hashed, signed or bound as associated data, so the
 * same logical value always yields the same bytes on every platform.
 *
 * Input is restricted to I-JSON (RFC 7493): finite numbers, well-formed Unicode strings, plain
 * objects and arrays. `undefined` object members are omitted (the domain model omits absent
 * optional fields); anything else that JSON cannot represent throws.
 */
import { CryptoError } from './errors.ts';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue | undefined };

/** Nesting limit: guards against stack exhaustion and reference cycles. */
const MAX_DEPTH = 64;

export function canonicalJson(value: unknown): string {
  return write(value, 0);
}

function write(value: unknown, depth: number): string {
  if (depth > MAX_DEPTH) fail('nesting is too deep (or the value is cyclic)');
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) fail('numbers must be finite');
      // ECMAScript Number::toString is exactly the JCS number serialization (RFC 8785 §3.2.2.3).
      return JSON.stringify(value);
    case 'string':
      if (!isWellFormed(value)) fail('strings must be well-formed Unicode');
      return JSON.stringify(value);
    case 'object':
      return Array.isArray(value) ? writeArray(value, depth) : writeObject(value, depth);
    default:
      return fail(`unsupported type "${typeof value}"`);
  }
}

function writeArray(items: readonly unknown[], depth: number): string {
  const parts: string[] = [];
  for (const item of items) {
    if (item === undefined) fail('arrays cannot contain undefined');
    parts.push(write(item, depth + 1));
  }
  return `[${parts.join(',')}]`;
}

function writeObject(value: object, depth: number): string {
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail('only plain objects are supported');
  const record = value as Record<string, unknown>;
  const parts: string[] = [];
  // Default sort compares UTF-16 code units, as RFC 8785 §3.2.3 requires.
  for (const key of Object.keys(record).sort()) {
    const member = record[key];
    if (member === undefined) continue;
    if (!isWellFormed(key)) fail('keys must be well-formed Unicode');
    parts.push(`${JSON.stringify(key)}:${write(member, depth + 1)}`);
  }
  return `{${parts.join(',')}}`;
}

/** True when the string has no unpaired surrogate (ES2024 `isWellFormed`, inlined for ES2023). */
function isWellFormed(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      i++;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function fail(reason: string): never {
  throw new CryptoError('invalid-argument', `Cannot canonicalize JSON: ${reason}`);
}
