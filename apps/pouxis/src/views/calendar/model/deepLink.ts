/** Deep links to calendar slots (1.13): `pouxis://event/<id>`. */
export const EVENT_LINK_PREFIX = 'pouxis://event/';

export function eventLink(id: string): string {
  return `${EVENT_LINK_PREFIX}${encodeURIComponent(id)}`;
}

/** Event id of a deep link, or `null` when `url` is not one. */
export function parseEventLink(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed.toLowerCase().startsWith(EVENT_LINK_PREFIX)) return null;
  const rest = trimmed.slice(EVENT_LINK_PREFIX.length).split(/[?#/]/)[0] ?? '';
  if (rest === '') return null;
  try {
    return decodeURIComponent(rest);
  } catch {
    return null;
  }
}
