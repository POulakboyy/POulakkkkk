/**
 * Permission primers (onboarding): read and request browser permissions without ever asking
 * twice on our own. Each request runs only from an explicit button press.
 */

export type PermissionState = 'default' | 'granted' | 'denied' | 'unavailable';

interface NotificationLike {
  permission: 'default' | 'granted' | 'denied';
  requestPermission(): Promise<'default' | 'granted' | 'denied'>;
}

function notificationApi(scope: object): NotificationLike | null {
  const n = (scope as { Notification?: NotificationLike }).Notification;
  return n && typeof n.requestPermission === 'function' ? n : null;
}

export function notificationState(scope: object = globalThis): PermissionState {
  return notificationApi(scope)?.permission ?? 'unavailable';
}

export async function requestNotifications(scope: object = globalThis): Promise<PermissionState> {
  const api = notificationApi(scope);
  if (!api) return 'unavailable';
  try {
    return await api.requestPermission();
  } catch {
    return 'denied';
  }
}

interface MediaDevicesLike {
  getUserMedia(constraints: { audio: boolean }): Promise<{ getTracks(): { stop(): void }[] }>;
}

function mediaDevices(scope: object): MediaDevicesLike | null {
  const nav = (scope as { navigator?: { mediaDevices?: MediaDevicesLike } }).navigator;
  return nav?.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function'
    ? nav.mediaDevices
    : null;
}

export function microphoneAvailable(scope: object = globalThis): boolean {
  return mediaDevices(scope) !== null;
}

/** Asks for the microphone, then releases it immediately: only the grant is wanted here. */
export async function requestMicrophone(scope: object = globalThis): Promise<PermissionState> {
  const devices = mediaDevices(scope);
  if (!devices) return 'unavailable';
  try {
    const stream = await devices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) track.stop();
    return 'granted';
  } catch {
    return 'denied';
  }
}
