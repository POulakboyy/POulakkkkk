/**
 * Per-device on/off switch for each lab feature. Every feature is on by default; turning one
 * off only hides it (its records stay in the store). The choice lives in local storage, like
 * the break rhythm: it is a display preference, not data worth syncing.
 */
import { useCallback, useSyncExternalStore } from 'react';

export const DISABLED_KEY = 'pouxis.lab.disabled';

const listeners = new Set<() => void>();
let cache: { raw: string | null; ids: ReadonlySet<string> } | undefined;
/** Fallback when storage throws (private mode): the choice lasts for this session. */
let memoryRaw: string | undefined;

function readRaw(): string | null {
  if (memoryRaw !== undefined) return memoryRaw;
  try {
    return globalThis.localStorage?.getItem(DISABLED_KEY) ?? null;
  } catch {
    return null;
  }
}

/** Parses the stored list, ignoring anything that is not an array of strings. */
export function parseDisabled(raw: string | null): ReadonlySet<string> {
  if (!raw) return new Set();
  try {
    const value: unknown = JSON.parse(raw);
    return new Set(
      Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

/** Disabled feature ids; the set is memoised on the raw string so snapshots stay stable. */
export function disabledFeatures(): ReadonlySet<string> {
  const raw = readRaw();
  if (!cache || cache.raw !== raw) cache = { raw, ids: parseDisabled(raw) };
  return cache.ids;
}

export function setFeatureEnabled(id: string, enabled: boolean): void {
  const next = new Set(disabledFeatures());
  if (enabled) next.delete(id);
  else next.add(id);
  const raw = JSON.stringify([...next].sort());
  try {
    if (!globalThis.localStorage) throw new Error('no storage');
    globalThis.localStorage.setItem(DISABLED_KEY, raw);
  } catch {
    memoryRaw = raw;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFeatureEnabled(id: string): [boolean, (enabled: boolean) => void] {
  const disabled = useSyncExternalStore(subscribe, disabledFeatures, disabledFeatures);
  const set = useCallback((enabled: boolean) => setFeatureEnabled(id, enabled), [id]);
  return [!disabled.has(id), set];
}
