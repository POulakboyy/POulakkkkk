/**
 * Per-device view preferences (selected mode, overlays, collaborator zones). Browser storage
 * may be unavailable (private mode, blocked site data): every access is guarded and the view
 * works without it.
 */
import { useCallback, useState } from 'react';

const PREFIX = 'pouxis.calendar.';

export function readStored<T>(key: string, fallback: T, valid: (value: unknown) => boolean): T {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the preference simply lasts for this session.
  }
}

/** `useState` mirrored to local storage. */
export function useStoredState<T>(
  key: string,
  fallback: T,
  valid: (value: unknown) => boolean,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => readStored(key, fallback, valid));
  const set = useCallback(
    (next: T) => {
      setValue(next);
      writeStored(key, next);
    },
    [key],
  );
  return [value, set];
}
