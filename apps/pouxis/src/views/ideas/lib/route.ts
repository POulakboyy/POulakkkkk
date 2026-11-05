export const IDEAS_TABS = ['notes', 'studio', 'journal', 'sandbox'] as const;
export type IdeasTab = (typeof IDEAS_TABS)[number];

/** Opens the brain dump from anywhere in the ideas view. */
export const BRAIN_DUMP_HOTKEY = 'alt+d';

/** Tab named by the `tab` route parameter; notes when absent or unknown. */
export function parseTab(value: string | null): IdeasTab {
  return (IDEAS_TABS as readonly string[]).includes(value ?? '') ? (value as IdeasTab) : 'notes';
}
