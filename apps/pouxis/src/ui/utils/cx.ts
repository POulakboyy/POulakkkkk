/** A value accepted by {@link cx}: strings, falsy values, nested arrays or `{ className: condition }` maps. */
export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | readonly ClassValue[]
  | Readonly<Record<string, unknown>>;

/**
 * Joins class names, skipping falsy values.
 *
 * @example cx(s.button, isActive && s.active, { [s.full]: fullWidth }, className)
 */
export function cx(...values: ClassValue[]): string {
  let out = '';
  for (const value of values) {
    if (!value && value !== 0) continue;
    let chunk = '';
    if (typeof value === 'string' || typeof value === 'number') chunk = String(value);
    else if (Array.isArray(value)) chunk = cx(...(value as ClassValue[]));
    else if (typeof value === 'object') {
      for (const key of Object.keys(value)) {
        if ((value as Record<string, unknown>)[key]) chunk += (chunk ? ' ' : '') + key;
      }
    }
    if (chunk) out += (out ? ' ' : '') + chunk;
  }
  return out;
}
