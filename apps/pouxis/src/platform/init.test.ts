import { afterEach, describe, expect, it, vi } from 'vitest';

const fakeNative = vi.hoisted(() => ({ kind: 'linux', native: true }));
vi.mock('./tauri.ts', () => ({ createTauriPlatform: () => fakeNative }));

const { initPlatform, isTauriRuntime, resetPlatformInitForTests } = await import('./init.ts');
const platformModule = await import('./index.ts');

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__TAURI_INTERNALS__;
  platformModule.setPlatform(platformModule.webPlatform);
  resetPlatformInitForTests();
});

describe('initPlatform', () => {
  it('detects the Tauri runtime from its injected global', () => {
    expect(isTauriRuntime({})).toBe(false);
    expect(isTauriRuntime({ __TAURI_INTERNALS__: {} })).toBe(true);
  });

  it('keeps the web platform in a browser', async () => {
    await expect(initPlatform()).resolves.toBe(platformModule.webPlatform);
    expect(platformModule.platform.native).toBe(false);
  });

  it('swaps in the native platform inside Tauri, once', async () => {
    (globalThis as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    const first = initPlatform();
    expect(initPlatform()).toBe(first);
    await expect(first).resolves.toBe(fakeNative);
    expect(platformModule.platform).toBe(fakeNative);
  });
});

describe('webPlatform', () => {
  it('reports honest fallbacks', async () => {
    const web = platformModule.webPlatform;
    await expect(web.setFocusMode(true)).resolves.toEqual({
      applied: false,
      method: 'none',
      reason: 'web',
    });
    await expect(web.toggleScrapbook()).resolves.toBe(false);
    const off = await web.onDeepLink(() => {});
    expect(off).toBeTypeOf('function');
  });
});
