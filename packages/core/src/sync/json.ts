/**
 * JSON value helpers for the replication layer: validating deep copies (so the replica never
 * aliases objects owned by the app), structural equality and a canonical order used for
 * deterministic tie-breaks.
 */

export type Json =
  | null
  | boolean
  | number
  | string
  | readonly Json[]
  | { readonly [key: string]: Json };

export class InvalidValueError extends Error {
  override readonly name = 'InvalidValueError';
}

/**
 * Validates `value` as JSON and returns a deeply frozen copy. Object properties whose value is
 * `undefined` are dropped (the model omits absent optional fields); `undefined` inside arrays,
 * non-finite numbers, cycles and non-plain objects (Date, Map, class instances) are rejected.
 */
export function freezeJson(value: unknown, path = '$'): Json {
  return copy(value, path, new Set());
}

function copy(value: unknown, path: string, stack: Set<object>): Json {
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value;
    case 'number':
      if (!Number.isFinite(value)) throw new InvalidValueError(`${path}: non-finite number`);
      return value === 0 ? 0 : value; // normalises -0
    case 'object': {
      if (value === null) return null;
      if (stack.has(value)) throw new InvalidValueError(`${path}: cyclic value`);
      stack.add(value);
      try {
        if (Array.isArray(value)) {
          const out: Json[] = new Array<Json>(value.length);
          for (let i = 0; i < value.length; i++) {
            const item: unknown = value[i];
            if (item === undefined) throw new InvalidValueError(`${path}[${i}]: undefined`);
            out[i] = copy(item, `${path}[${i}]`, stack);
          }
          return Object.freeze(out);
        }
        const proto: unknown = Object.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null) {
          throw new InvalidValueError(`${path}: not a plain object`);
        }
        const out: { [key: string]: Json } = {};
        for (const key of Object.keys(value)) {
          const item = (value as Record<string, unknown>)[key];
          if (item === undefined) continue;
          const v = copy(item, `${path}.${key}`, stack);
          if (key === '__proto__') {
            Object.defineProperty(out, key, {
              value: v,
              enumerable: true,
              writable: true,
              configurable: true,
            });
          } else out[key] = v;
        }
        return Object.freeze(out);
      } finally {
        stack.delete(value);
      }
    }
    default:
      throw new InvalidValueError(`${path}: ${typeof value} is not JSON`);
  }
}

/** Deep structural equality; `undefined` (an unset field) only equals `undefined`. */
export function jsonEqual(a: Json | undefined, b: Json | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined || a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!jsonEqual(a[i], b[i])) return false;
    return true;
  }
  if (Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const ob = b as { readonly [key: string]: Json };
  if (ka.length !== Object.keys(ob).length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(ob, k)) return false;
    if (!jsonEqual((a as { readonly [key: string]: Json })[k], ob[k])) return false;
  }
  return true;
}

/** JSON text with sorted object keys: equal values give equal strings. `undefined` → `''`. */
export function canonicalJson(value: Json | undefined): string {
  if (value === undefined) return '';
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: Json): Json {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const obj = value as { readonly [key: string]: Json };
  const out: { [key: string]: Json } = {};
  for (const k of Object.keys(obj).sort()) {
    const v = sortKeys(obj[k] as Json);
    if (k === '__proto__') {
      Object.defineProperty(out, k, { value: v, enumerable: true, writable: true });
    } else out[k] = v;
  }
  return out;
}

/** Deterministic total order on JSON values (used only to break exact-HLC ties). */
export function compareJson(a: Json | undefined, b: Json | undefined): number {
  const x = canonicalJson(a);
  const y = canonicalJson(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Arrays and objects: values that are potentially large and excluded from default history. */
export function isStructured(value: Json | undefined): boolean {
  return value !== null && typeof value === 'object';
}
