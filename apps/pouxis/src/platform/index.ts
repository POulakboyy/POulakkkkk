/**
 * Native capabilities behind one interface. The web implementation degrades gracefully;
 * the Tauri implementation (iOS, Android, macOS, Windows, Linux) replaces it at startup.
 */

export type PlatformKind = 'web' | 'macos' | 'windows' | 'linux' | 'ios' | 'android';
export type HapticKind =
  'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export interface Platform {
  kind: PlatformKind;
  /** True inside the native Tauri shell. */
  native: boolean;
  /** Turns the OS "Do Not Disturb"/Focus on or off where the OS allows it (1.11). */
  setFocusMode(on: boolean): Promise<boolean>;
  notify(title: string, body?: string): Promise<void>;
  haptic(kind: HapticKind): void;
  /** Registers a system-wide shortcut (e.g. `CommandOrControl+Shift+Space`, 2.11). Returns an unregister function. */
  registerGlobalShortcut(accelerator: string, handler: () => void): Promise<() => void>;
}

const HAPTIC_MS: Record<HapticKind, number | number[]> = {
  selection: 8,
  light: 10,
  medium: 18,
  heavy: 28,
  success: [10, 40, 16],
  warning: [18, 60, 18],
  error: [24, 50, 24, 50, 24],
};

export const webPlatform: Platform = {
  kind: 'web',
  native: false,
  async setFocusMode() {
    return false;
  },
  async notify(title, body) {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') await Notification.requestPermission();
    if (Notification.permission === 'granted') new Notification(title, body ? { body } : undefined);
  },
  haptic(kind) {
    globalThis.navigator?.vibrate?.(HAPTIC_MS[kind]);
  },
  async registerGlobalShortcut() {
    // Browsers cannot capture shortcuts outside the page; in-app shortcuts are handled by the UI.
    return () => {};
  },
};

export let platform: Platform = webPlatform;

/** Swaps in a native implementation (called once by the Tauri bootstrap). */
export function setPlatform(next: Platform): void {
  platform = next;
}
