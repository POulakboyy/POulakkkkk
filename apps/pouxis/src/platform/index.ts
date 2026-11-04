/**
 * Native capabilities behind one interface. The web implementation degrades gracefully;
 * the Tauri implementation (iOS, Android, macOS, Windows, Linux) replaces it at startup
 * through `initPlatform()` (see `init.ts`).
 */

import type { DeepLinkPayload, TrayAction } from './events.ts';

export type { DeepLinkKind, DeepLinkPayload, TrayAction } from './events.ts';
export { deepLinkRoute } from './events.ts';

export type PlatformKind = 'web' | 'macos' | 'windows' | 'linux' | 'ios' | 'android';
export type HapticKind =
  'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/** How OS focus was applied. Mirrors `FocusMethod` in `src-tauri/src/focus.rs`. */
export type FocusMethod = 'macos-shortcuts' | 'gnome-gsettings' | 'none';

/** Stable reason codes (translate them in the UI). Mirrors `FocusReason` in `focus.rs`. */
export type FocusReason =
  | 'no-public-api'
  | 'os-restricted'
  | 'needs-native-plugin'
  | 'shortcuts-cli-missing'
  | 'shortcut-missing'
  | 'desktop-not-gnome'
  | 'gsettings-missing'
  | 'schema-missing'
  | 'command-failed'
  | 'timeout'
  /** Web build: browsers cannot change OS notification settings. */
  | 'web';

export interface FocusModeResult {
  /** True only when the OS setting really changed (otherwise use the in-app quiet mode). */
  applied: boolean;
  method: FocusMethod;
  reason: FocusReason | null;
}

export interface FocusModeSupport {
  available: boolean;
  method: FocusMethod;
  reason: FocusReason | null;
}

export type Unsubscribe = () => void;

export interface Platform {
  kind: PlatformKind;
  /** True inside the native Tauri shell. */
  native: boolean;
  /** Turns the OS "Do Not Disturb"/Focus on or off where the OS allows it (1.11). */
  setFocusMode(on: boolean): Promise<FocusModeResult>;
  /** Whether `setFocusMode` can work right now, without changing anything (settings screen). */
  focusModeSupport(): Promise<FocusModeSupport>;
  notify(title: string, body?: string): Promise<void>;
  haptic(kind: HapticKind): void;
  /** Registers a system-wide shortcut (e.g. `CommandOrControl+Alt+N`). Returns an unregister function. */
  registerGlobalShortcut(accelerator: string, handler: () => void): Promise<Unsubscribe>;
  /** `pouxis://event/<id>` and `pouxis://task/<id>` links, including the one that launched the app (1.13). */
  onDeepLink(handler: (link: DeepLinkPayload) => void): Promise<Unsubscribe>;
  /** Desktop tray actions the UI must route (e.g. "today"). */
  onTrayAction(handler: (action: TrayAction) => void): Promise<Unsubscribe>;
  /** Fired in the capture window each time the global shortcut shows it (2.11): reset and focus the input. */
  onCaptureShown(handler: () => void): Promise<Unsubscribe>;
  /** Hides the current window if it is the capture palette or the scrapbook; no-op elsewhere. */
  hideOverlay(): Promise<void>;
  /** Opens or closes the floating scrapbook drop window (desktop, 5.6). Resolves to its visibility. */
  toggleScrapbook(): Promise<boolean>;
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

const noop: Unsubscribe = () => {};

export const webPlatform: Platform = {
  kind: 'web',
  native: false,
  async setFocusMode() {
    return { applied: false, method: 'none', reason: 'web' };
  },
  async focusModeSupport() {
    return { available: false, method: 'none', reason: 'web' };
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
    return noop;
  },
  async onDeepLink() {
    return noop;
  },
  async onTrayAction() {
    return noop;
  },
  async onCaptureShown() {
    return noop;
  },
  async hideOverlay() {},
  async toggleScrapbook() {
    return false;
  },
};

export let platform: Platform = webPlatform;

/** Swaps in a native implementation (called once by `initPlatform`). */
export function setPlatform(next: Platform): void {
  platform = next;
}
