/** Category colour of an event: its own `color` (1–8), or a default per kind. */
import type { CalendarEvent, EventKind } from '@pouxis/core';

export type Category = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const KIND_CATEGORY: Record<EventKind, Category> = {
  meeting: 4,
  focus: 3,
  personal: 5,
  travel: 2,
  buffer: 8,
};

export function categoryOf(event: Pick<CalendarEvent, 'color' | 'kind'>): Category {
  const c = event.color;
  if (c !== undefined && Number.isInteger(c) && c >= 1 && c <= 8) return c as Category;
  return KIND_CATEGORY[event.kind];
}

/** CSS colour of the category fill (`--cat-N`; text on top stays `--ink`). */
export function categoryFill(event: Pick<CalendarEvent, 'color' | 'kind'>): string {
  return `var(--cat-${categoryOf(event)})`;
}
