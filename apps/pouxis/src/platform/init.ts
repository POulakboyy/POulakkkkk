import { platform, setPlatform } from './index.ts';
import type { Platform } from './index.ts';

/** Tauri 2 injects this global into every webview it controls. */
export function isTauriRuntime(scope: object = globalThis): boolean {
  return '__TAURI_INTERNALS__' in scope;
}

let pending: Promise<Platform> | undefined;

/**
 * Installs the native platform when running inside the Tauri shell; keeps the web one
 * otherwise or if loading fails. Idempotent: call it once before rendering (`main.tsx`).
 */
export function initPlatform(): Promise<Platform> {
  pending ??= load();
  return pending;
}

async function load(): Promise<Platform> {
  if (!isTauriRuntime()) return platform;
  try {
    const { createTauriPlatform } = await import('./tauri.ts');
    setPlatform(createTauriPlatform());
  } catch (error) {
    console.warn('[platform] native shell detected but could not be initialised', error);
  }
  return platform;
}

/** Test-only: forgets the memoised initialisation. */
export function resetPlatformInitForTests(): void {
  pending = undefined;
}
