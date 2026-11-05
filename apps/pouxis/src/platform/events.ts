/**
 * Event names, window labels and payloads shared with the native shell.
 * Contract with `src-tauri/src/events.rs` and `deep_link.rs`: change both sides together.
 */

export const MAIN_WINDOW = 'main';
export const CAPTURE_WINDOW = 'capture';
export const SCRAPBOOK_WINDOW = 'scrapbook';

export const DEEP_LINK_EVENT = 'pouxis:deep-link';
export const TRAY_ACTION_EVENT = 'pouxis:tray';
export const CAPTURE_SHOWN_EVENT = 'pouxis:capture-shown';

export type DeepLinkKind = 'event' | 'task';

/** Already validated by the shell; `url` is rebuilt from `kind` and `id`. */
export interface DeepLinkPayload {
  kind: DeepLinkKind;
  id: string;
  url: string;
}

export type TrayAction = 'today';

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/** Defensive re-check of what crosses the IPC boundary (same rules as `deep_link::parse`). */
export function isDeepLinkPayload(value: unknown): value is DeepLinkPayload {
  if (typeof value !== 'object' || value === null) return false;
  const { kind, id, url } = value as Record<string, unknown>;
  return (
    (kind === 'event' || kind === 'task') &&
    typeof id === 'string' &&
    ID_PATTERN.test(id) &&
    url === `pouxis://${kind}/${id}`
  );
}

export function isTrayAction(value: unknown): value is TrayAction {
  return value === 'today';
}

/** Where a deep link opens: feed the result to `navigate(view, params)` from `src/app/router.ts`. */
export function deepLinkRoute(link: DeepLinkPayload): {
  view: 'calendar' | 'tasks';
  params: Record<string, string>;
} {
  return link.kind === 'event'
    ? { view: 'calendar', params: { event: link.id } }
    : { view: 'tasks', params: { task: link.id } };
}
