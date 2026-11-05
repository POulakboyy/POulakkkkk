/**
 * Platform implementation for the Tauri 2 shell. Loaded lazily by `initPlatform()` so the
 * web build never evaluates Tauri code. Every call degrades to a safe no-op on failure: a
 * missing native capability must never break the UI.
 */

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { platform as osPlatform } from '@tauri-apps/plugin-os';
import {
  CAPTURE_SHOWN_EVENT,
  DEEP_LINK_EVENT,
  MAIN_WINDOW,
  TRAY_ACTION_EVENT,
  isDeepLinkPayload,
  isTrayAction,
} from './events.ts';
import type { DeepLinkPayload } from './events.ts';
import type {
  FocusModeResult,
  FocusModeSupport,
  HapticKind,
  Platform,
  PlatformKind,
  Unsubscribe,
} from './index.ts';

export function toPlatformKind(os: string): PlatformKind {
  switch (os) {
    case 'macos':
    case 'windows':
    case 'ios':
    case 'android':
      return os;
    default:
      // Linux and the BSDs share the same desktop integration.
      return 'linux';
  }
}

interface HapticCall {
  cmd: string;
  args?: Record<string, string>;
}

/** Maps a haptic kind to a `tauri-plugin-haptics` command (iOS/Android only). */
export function hapticCall(kind: HapticKind): HapticCall {
  switch (kind) {
    case 'selection':
      return { cmd: 'plugin:haptics|selection_feedback' };
    case 'light':
    case 'medium':
    case 'heavy':
      return { cmd: 'plugin:haptics|impact_feedback', args: { style: kind } };
    case 'success':
    case 'warning':
    case 'error':
      return { cmd: 'plugin:haptics|notification_feedback', args: { type: kind } };
  }
}

const FOCUS_FAILED: FocusModeResult = { applied: false, method: 'none', reason: 'command-failed' };

function warn(what: string, error: unknown): void {
  console.warn(`[platform] ${what} failed`, error);
}

async function listenHere<T>(event: string, handler: (payload: T) => void): Promise<Unsubscribe> {
  try {
    return await getCurrentWebviewWindow().listen<T>(event, (e) => handler(e.payload));
  } catch (error) {
    warn(`listen(${event})`, error);
    return () => {};
  }
}

/** Live links plus the ones queued by the shell before the UI listened (cold start). */
async function onDeepLink(handler: (link: DeepLinkPayload) => void): Promise<Unsubscribe> {
  const deliver = (value: unknown) => {
    if (isDeepLinkPayload(value)) handler(value);
  };
  // Listen first, then drain: a link arriving in between is queued by the shell, not lost.
  const unlisten = await listenHere<unknown>(DEEP_LINK_EVENT, deliver);
  if (getCurrentWebviewWindow().label === MAIN_WINDOW) {
    try {
      const pending = await invoke<unknown[]>('deep_link_take_pending');
      pending.forEach(deliver);
    } catch (error) {
      warn('deep_link_take_pending', error);
    }
  }
  return unlisten;
}

export function createTauriPlatform(): Platform {
  const kind = toPlatformKind(osPlatform());
  const mobile = kind === 'ios' || kind === 'android';

  return {
    kind,
    native: true,

    async setFocusMode(on) {
      try {
        return await invoke<FocusModeResult>('set_focus_mode', { on });
      } catch (error) {
        warn('set_focus_mode', error);
        return FOCUS_FAILED;
      }
    },

    async focusModeSupport() {
      try {
        return await invoke<FocusModeSupport>('focus_mode_support');
      } catch (error) {
        warn('focus_mode_support', error);
        return { available: false, method: 'none', reason: 'command-failed' };
      }
    },

    async notify(title, body) {
      try {
        let granted = await isPermissionGranted();
        if (!granted) granted = (await requestPermission()) === 'granted';
        if (granted) sendNotification(body ? { title, body } : { title });
      } catch (error) {
        warn('notify', error);
      }
    },

    haptic(kind) {
      // Desktop has no haptic engine reachable from the plugin.
      if (!mobile) return;
      const { cmd, args } = hapticCall(kind);
      invoke(cmd, args).catch((error: unknown) => warn(cmd, error));
    },

    async registerGlobalShortcut(accelerator, handler) {
      if (mobile) return () => {};
      try {
        await register(accelerator, (event) => {
          if (event.state === 'Pressed') handler();
        });
      } catch (error) {
        warn(`register(${accelerator})`, error);
        return () => {};
      }
      return () => {
        unregister(accelerator).catch((error: unknown) => warn('unregister', error));
      };
    },

    onDeepLink,

    onTrayAction(handler) {
      return listenHere<unknown>(TRAY_ACTION_EVENT, (value) => {
        if (isTrayAction(value)) handler(value);
      });
    },

    onCaptureShown(handler) {
      return listenHere<unknown>(CAPTURE_SHOWN_EVENT, () => handler());
    },

    async hideOverlay() {
      if (mobile) return;
      try {
        await invoke('hide_overlay');
      } catch (error) {
        warn('hide_overlay', error);
      }
    },

    async toggleScrapbook() {
      if (mobile) return false;
      try {
        return await invoke<boolean>('toggle_scrapbook');
      } catch (error) {
        warn('toggle_scrapbook', error);
        return false;
      }
    },
  };
}
