import { search } from '@pouxis/core';

export interface Completion {
  /** Text inserted in place of the fragment, including the sigil (`#perso`). */
  value: string;
  /** Range of the input the completion replaces. */
  start: number;
  end: number;
}

const SIGILS = { '#': 'tag', '@': 'person' } as const;
export type CompletionKind = (typeof SIGILS)[keyof typeof SIGILS];

/** The `#frag` / `@frag` word that ends at `caret`, if any. */
export function fragmentAt(
  text: string,
  caret: number,
): { kind: CompletionKind; sigil: string; query: string; start: number } | null {
  const before = text.slice(0, caret);
  const match = /(?:^|\s)([#@])([\p{L}\p{N}_-]*)$/u.exec(before);
  if (!match) return null;
  const sigil = match[1] as keyof typeof SIGILS;
  const query = match[2] ?? '';
  return { kind: SIGILS[sigil], sigil, query, start: caret - query.length - 1 };
}

/**
 * Best known tag or person completing the fragment at the caret, accent- and case-insensitive.
 * Exact matches are not suggested (nothing left to complete); shorter names win ties.
 */
export function completeAt(
  text: string,
  caret: number,
  known: { tags: readonly string[]; people: readonly string[] },
): Completion | null {
  const frag = fragmentAt(text, caret);
  if (!frag || frag.query === '') return null;
  const pool = frag.kind === 'tag' ? known.tags : known.people;
  const q = search.fold(frag.query);
  let best: string | undefined;
  for (const name of pool) {
    const folded = search.fold(name);
    if (folded === q || !folded.startsWith(q)) continue;
    if (best === undefined || name.length < best.length) best = name;
  }
  if (best === undefined) return null;
  let end = caret;
  while (end < text.length && !/\s/.test(text[end]!)) end++;
  return { value: `${frag.sigil}${best}`, start: frag.start, end };
}

export function applyCompletion(text: string, c: Completion): { text: string; caret: number } {
  const next = `${text.slice(0, c.start)}${c.value} ${text.slice(c.end).replace(/^\s+/, '')}`;
  return { text: next, caret: c.start + c.value.length + 1 };
}

/** Distinct tags and attendees already used, most frequent first. */
export function knownVocabulary(
  records: readonly { tags: readonly string[]; attendees?: readonly string[] }[],
): { tags: string[]; people: string[] } {
  const tags = new Map<string, number>();
  const people = new Map<string, number>();
  for (const r of records) {
    for (const t of r.tags) tags.set(t, (tags.get(t) ?? 0) + 1);
    for (const p of r.attendees ?? []) people.set(p, (people.get(p) ?? 0) + 1);
  }
  const ranked = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  return { tags: ranked(tags), people: ranked(people) };
}
