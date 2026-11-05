import type { Ref, RefCallback } from 'react';

/** Assigns `value` to a callback or object ref. */
export function setRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/** Combines several refs into one callback ref (e.g. a forwarded ref and an internal one). */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (value) => {
    for (const ref of refs) setRef(ref, value);
  };
}
