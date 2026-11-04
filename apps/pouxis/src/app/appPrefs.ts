import { useSyncExternalStore } from 'react';
import type { WorkMode, insights } from '@pouxis/core';

/**
 * Device-local preferences of the client itself (appearance, onboarding, keyboard, sync
 * endpoint). Domain preferences that the engine needs (working hours, buffers, WIP limit…)
 * live in `UserPrefs` and go through the store; these never leave the device.
 *
 * Secrets are never stored here: the sync passphrase stays in memory only.
 */

export type ThemePref = 'auto' | 'light' | 'dark' | 'daylight' | 'eink';
export const THEMES: readonly ThemePref[] = ['auto', 'light', 'dark', 'daylight', 'eink'];

export type Chronotype = insights.Chronotype;
export const CHRONOTYPE_VALUES: readonly Chronotype[] = ['morning', 'intermediate', 'evening'];

export type KeymapPreset = 'default' | 'vim';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface AppPrefs {
  theme: ThemePref;
  /** Interface zen (7.4): chrome fades after a few idle seconds. */
  zen: boolean;
  haptics: boolean;
  /** Mode given to captured tasks when the parser cannot infer one. */
  defaultMode: WorkMode;
  /** Optional self-assessed chronotype (onboarding), a prior for the energy heatmap (1.3). */
  chronotype: Chronotype | null;
  onboarded: boolean;
  /** Local statistics feeding the insights view; computed and kept on this device. */
  telemetry: boolean;
  crashReports: boolean;
  syncEnabled: boolean;
  relayUrl: string;
  keymapPreset: KeymapPreset;
  /** User overrides as JSON text (see keymap.ts); empty = preset only. */
  keymap: string;
  /** Where the daylight theme reads the sun from; asked only when that theme is chosen. */
  location: Coordinates | null;
}

export const DEFAULT_APP_PREFS: AppPrefs = {
  theme: 'auto',
  zen: false,
  haptics: true,
  defaultMode: 'organize',
  chronotype: null,
  onboarded: false,
  telemetry: true,
  crashReports: false,
  syncEnabled: false,
  relayUrl: '',
  keymapPreset: 'default',
  keymap: '',
  location: null,
};

export const APP_PREFS_KEY = 'pouxis:app-prefs:v1';

const listeners = new Set<() => void>();
let current: AppPrefs = load();

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function coordinates(value: unknown): Coordinates | null {
  if (typeof value !== 'object' || value === null) return null;
  const { latitude, longitude } = value as Record<string, unknown>;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

/** Coerces untrusted stored data into valid preferences, field by field. */
export function sanitizeAppPrefs(raw: unknown): AppPrefs {
  const d = DEFAULT_APP_PREFS;
  if (typeof raw !== 'object' || raw === null) return { ...d };
  const r = raw as Record<string, unknown>;
  return {
    theme: oneOf(r.theme, THEMES, d.theme),
    zen: bool(r.zen, d.zen),
    haptics: bool(r.haptics, d.haptics),
    defaultMode: oneOf<WorkMode>(r.defaultMode, ['create', 'organize'], d.defaultMode),
    chronotype:
      r.chronotype === null ? null : oneOf(r.chronotype, CHRONOTYPE_VALUES, 'intermediate'),
    onboarded: bool(r.onboarded, d.onboarded),
    telemetry: bool(r.telemetry, d.telemetry),
    crashReports: bool(r.crashReports, d.crashReports),
    syncEnabled: bool(r.syncEnabled, d.syncEnabled),
    relayUrl: typeof r.relayUrl === 'string' ? r.relayUrl : d.relayUrl,
    keymapPreset: oneOf<KeymapPreset>(r.keymapPreset, ['default', 'vim'], d.keymapPreset),
    keymap: typeof r.keymap === 'string' ? r.keymap : d.keymap,
    location: coordinates(r.location),
  };
}

function load(): AppPrefs {
  try {
    const raw = globalThis.localStorage?.getItem(APP_PREFS_KEY);
    if (raw) return sanitizeAppPrefs(JSON.parse(raw));
  } catch {
    // Unavailable or corrupt storage: defaults.
  }
  return { ...DEFAULT_APP_PREFS };
}

function save(): void {
  try {
    globalThis.localStorage?.setItem(APP_PREFS_KEY, JSON.stringify(current));
  } catch {
    // Private mode or quota: preferences still apply for this session.
  }
}

export function getAppPrefs(): AppPrefs {
  return current;
}

export function setAppPrefs(patch: Partial<AppPrefs>): void {
  current = { ...current, ...patch };
  save();
  for (const l of [...listeners]) l();
}

export function resetAppPrefs(keep: Partial<AppPrefs> = {}): void {
  setAppPrefs({ ...DEFAULT_APP_PREFS, ...keep });
}

export function subscribeAppPrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only: reloads from storage. */
export function reloadAppPrefsForTests(): void {
  current = load();
  for (const l of [...listeners]) l();
}

export function useAppPrefs(): AppPrefs {
  return useSyncExternalStore(subscribeAppPrefs, getAppPrefs, getAppPrefs);
}
