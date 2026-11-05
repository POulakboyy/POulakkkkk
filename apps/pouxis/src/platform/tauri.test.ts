import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  listen: vi.fn(),
  label: 'main',
  os: 'macos',
  register: vi.fn(),
  unregister: vi.fn(),
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({
  getCurrentWebviewWindow: () => ({ label: mocks.label, listen: mocks.listen }),
}));
vi.mock('@tauri-apps/plugin-global-shortcut', () => ({
  register: mocks.register,
  unregister: mocks.unregister,
}));
vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: mocks.isPermissionGranted,
  requestPermission: mocks.requestPermission,
  sendNotification: mocks.sendNotification,
}));
vi.mock('@tauri-apps/plugin-os', () => ({ platform: () => mocks.os }));

const { createTauriPlatform, hapticCall, toPlatformKind } = await import('./tauri.ts');
const { deepLinkRoute, isDeepLinkPayload } = await import('./events.ts');

type Handler = (event: { payload: unknown }) => void;
const handlers = new Map<string, Handler>();

beforeEach(() => {
  mocks.label = 'main';
  mocks.os = 'macos';
  handlers.clear();
  mocks.listen.mockImplementation(async (event: string, handler: Handler) => {
    handlers.set(event, handler);
    return () => handlers.delete(event);
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe('platform detection', () => {
  it('maps OS names to platform kinds', () => {
    expect(toPlatformKind('windows')).toBe('windows');
    expect(toPlatformKind('ios')).toBe('ios');
    expect(toPlatformKind('freebsd')).toBe('linux');
    mocks.os = 'android';
    expect(createTauriPlatform()).toMatchObject({ kind: 'android', native: true });
  });
});

describe('focus mode', () => {
  it('returns the shell result as is', async () => {
    const result = { applied: true, method: 'macos-shortcuts', reason: null };
    mocks.invoke.mockResolvedValue(result);
    await expect(createTauriPlatform().setFocusMode(true)).resolves.toEqual(result);
    expect(mocks.invoke).toHaveBeenCalledWith('set_focus_mode', { on: true });
  });

  it('reports a failure instead of throwing', async () => {
    mocks.invoke.mockRejectedValue(new Error('not allowed'));
    const p = createTauriPlatform();
    await expect(p.setFocusMode(false)).resolves.toMatchObject({ applied: false });
    await expect(p.focusModeSupport()).resolves.toMatchObject({
      available: false,
      reason: 'command-failed',
    });
  });
});

describe('deep links', () => {
  const task = { kind: 'task', id: 't1', url: 'pouxis://task/t1' };
  const event = { kind: 'event', id: 'e1', url: 'pouxis://event/e1' };

  it('delivers queued links after listening, then live ones', async () => {
    mocks.invoke.mockResolvedValue([task, { kind: 'note', id: 'x', url: 'pouxis://note/x' }]);
    const received: unknown[] = [];
    await createTauriPlatform().onDeepLink((link) => received.push(link));
    expect(mocks.listen.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.invoke.mock.invocationCallOrder[0] ?? 0,
    );
    handlers.get('pouxis:deep-link')?.({ payload: event });
    handlers.get('pouxis:deep-link')?.({ payload: { ...event, url: 'https://evil.example' } });
    expect(received).toEqual([task, event]);
  });

  it('only drains the queue from the main window', async () => {
    mocks.label = 'capture';
    await createTauriPlatform().onDeepLink(() => {});
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('validates payloads and maps them to routes', () => {
    expect(isDeepLinkPayload(task)).toBe(true);
    expect(isDeepLinkPayload({ ...task, id: '../x', url: 'pouxis://task/../x' })).toBe(false);
    expect(isDeepLinkPayload(null)).toBe(false);
    expect(deepLinkRoute(event as never)).toEqual({ view: 'calendar', params: { event: 'e1' } });
    expect(deepLinkRoute(task as never)).toEqual({ view: 'tasks', params: { task: 't1' } });
  });
});

describe('shell events and overlays', () => {
  it('forwards known tray actions and capture-shown events', async () => {
    const p = createTauriPlatform();
    const actions: string[] = [];
    let shown = 0;
    await p.onTrayAction((a) => actions.push(a));
    await p.onCaptureShown(() => shown++);
    handlers.get('pouxis:tray')?.({ payload: 'today' });
    handlers.get('pouxis:tray')?.({ payload: 'format-disk' });
    handlers.get('pouxis:capture-shown')?.({ payload: null });
    expect(actions).toEqual(['today']);
    expect(shown).toBe(1);
  });

  it('survives a listen failure', async () => {
    mocks.listen.mockRejectedValue(new Error('denied'));
    const off = await createTauriPlatform().onTrayAction(() => {});
    expect(off).toBeTypeOf('function');
  });

  it('calls the overlay commands on desktop only', async () => {
    mocks.invoke.mockResolvedValue(true);
    await expect(createTauriPlatform().toggleScrapbook()).resolves.toBe(true);
    await createTauriPlatform().hideOverlay();
    expect(mocks.invoke.mock.calls.map((c) => c[0])).toEqual(['toggle_scrapbook', 'hide_overlay']);

    mocks.invoke.mockClear();
    mocks.os = 'ios';
    await expect(createTauriPlatform().toggleScrapbook()).resolves.toBe(false);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});

describe('global shortcuts', () => {
  it('fires on press only and unregisters', async () => {
    let shortcutHandler: ((e: { state: string }) => void) | undefined;
    mocks.register.mockImplementation(async (_: string, h: typeof shortcutHandler) => {
      shortcutHandler = h;
    });
    mocks.unregister.mockResolvedValue(undefined);
    const handler = vi.fn();
    const off = await createTauriPlatform().registerGlobalShortcut(
      'CommandOrControl+Alt+N',
      handler,
    );
    shortcutHandler?.({ state: 'Pressed' });
    shortcutHandler?.({ state: 'Released' });
    expect(handler).toHaveBeenCalledTimes(1);
    off();
    expect(mocks.unregister).toHaveBeenCalledWith('CommandOrControl+Alt+N');
  });

  it('returns a no-op when the shortcut is taken', async () => {
    mocks.register.mockRejectedValue(new Error('taken'));
    const off = await createTauriPlatform().registerGlobalShortcut('F1', () => {});
    off();
    expect(mocks.unregister).not.toHaveBeenCalled();
  });
});

describe('notifications and haptics', () => {
  it('asks for permission once, then notifies', async () => {
    mocks.isPermissionGranted.mockResolvedValue(false);
    mocks.requestPermission.mockResolvedValue('granted');
    await createTauriPlatform().notify('Pause', 'Respirez');
    expect(mocks.sendNotification).toHaveBeenCalledWith({ title: 'Pause', body: 'Respirez' });
  });

  it('does not notify when permission is denied', async () => {
    mocks.isPermissionGranted.mockResolvedValue(false);
    mocks.requestPermission.mockResolvedValue('denied');
    await createTauriPlatform().notify('Pause');
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it('maps haptic kinds to plugin commands', () => {
    expect(hapticCall('selection')).toEqual({ cmd: 'plugin:haptics|selection_feedback' });
    expect(hapticCall('heavy')).toEqual({
      cmd: 'plugin:haptics|impact_feedback',
      args: { style: 'heavy' },
    });
    expect(hapticCall('error')).toEqual({
      cmd: 'plugin:haptics|notification_feedback',
      args: { type: 'error' },
    });
  });

  it('plays haptics on mobile only', () => {
    mocks.invoke.mockResolvedValue(undefined);
    createTauriPlatform().haptic('light');
    expect(mocks.invoke).not.toHaveBeenCalled();
    mocks.os = 'android';
    createTauriPlatform().haptic('success');
    expect(mocks.invoke).toHaveBeenCalledWith('plugin:haptics|notification_feedback', {
      type: 'success',
    });
  });
});
