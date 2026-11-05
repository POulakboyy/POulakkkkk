/**
 * Idea incubation (X.13): park a note on purpose and have it come back after growing gaps, so
 * an unsolved idea gets set aside then revisited instead of forgotten. Incubation helps
 * problem solving, more so for divergent tasks (Sio and Ormerod, 2009). The gaps are a product
 * choice (spacing as in review apps), not a value taken from the meta-analysis.
 *
 * One `dump` entry per parked note: `lab:incubation`, `lab:note:<id>`, `lab:stage:<n>` and
 * `lab:since:<YYYY-MM-DD>` (day of the last review). The date lives in a tag rather than in
 * `updatedAt`, which sync and undo may touch.
 */
import {
  addDays,
  dayKey,
  fromZoned,
  startOfDay,
  type Id,
  type JournalEntry,
  type Note,
  type TimeZone,
  type Timestamp,
} from '@pouxis/core';
import { labTag, withTags } from '../shared/journal.ts';

export const INCUBATION_TAG = labTag('incubation');
/** Days before each resurfacing; the last gap repeats. */
export const INTERVALS_DAYS = [1, 3, 7, 21] as const;
export const MAX_CANDIDATES = 6;
/** The ideas view hides notes with this tag (`views/ideas/lib/notes.ts`). */
const ARCHIVED_TAG = 'archived';

const NOTE_PREFIX = labTag('note', '');
const STAGE_PREFIX = labTag('stage', '');
const SINCE_PREFIX = labTag('since', '');

export interface Incubating {
  entry: JournalEntry;
  note: Note;
  stage: number;
  dueAt: Timestamp;
}

function tagValue(entry: JournalEntry, prefix: string): string | undefined {
  return entry.tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length);
}

export function incubationTags(noteId: Id, stage: number, day: Timestamp, tz: TimeZone): string[] {
  return [
    INCUBATION_TAG,
    NOTE_PREFIX + noteId,
    STAGE_PREFIX + String(stage),
    SINCE_PREFIX + dayKey(day, tz),
  ];
}

export function stageOf(entry: JournalEntry): number {
  const n = Number(tagValue(entry, STAGE_PREFIX));
  return Number.isInteger(n) ? Math.min(Math.max(n, 0), INTERVALS_DAYS.length - 1) : 0;
}

export function nextStage(stage: number): number {
  return Math.min(stage + 1, INTERVALS_DAYS.length - 1);
}

/** Local midnight of the resurfacing day; falls back to the entry's creation day. */
export function dueAt(entry: JournalEntry, timeZone: TimeZone): Timestamp {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tagValue(entry, SINCE_PREFIX) ?? '');
  const since = match
    ? fromZoned(
        { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) },
        timeZone,
      )
    : startOfDay(entry.createdAt, timeZone);
  return addDays(since, INTERVALS_DAYS[stageOf(entry)] ?? 1, timeZone);
}

const isEligible = (note: Note): boolean =>
  !note.sandbox && note.vaultId === undefined && !note.tags.includes(ARCHIVED_TAG);

/** Parked notes still present, soonest due first (one per note, the newest entry wins). */
export function incubating(
  journal: readonly JournalEntry[],
  notes: readonly Note[],
  timeZone: TimeZone,
): Incubating[] {
  const byId = new Map(notes.filter(isEligible).map((note) => [note.id, note]));
  const seen = new Set<Id>();
  const list: Incubating[] = [];
  for (const entry of withTags(journal, INCUBATION_TAG)) {
    const noteId = tagValue(entry, NOTE_PREFIX);
    const note = noteId ? byId.get(noteId) : undefined;
    if (!note || seen.has(note.id)) continue;
    seen.add(note.id);
    list.push({ entry, note, stage: stageOf(entry), dueAt: dueAt(entry, timeZone) });
  }
  return list.sort((a, b) => a.dueAt - b.dueAt || (a.note.id < b.note.id ? -1 : 1));
}

export function splitDue(
  list: readonly Incubating[],
  now: Timestamp,
): { due: Incubating[]; waiting: Incubating[] } {
  return {
    due: list.filter((item) => item.dueAt <= now),
    waiting: list.filter((item) => item.dueAt > now),
  };
}

/** Recent notes that could be parked: visible in the ideas view and not already incubating. */
export function incubationCandidates(
  notes: readonly Note[],
  parked: readonly Incubating[],
): Note[] {
  const taken = new Set(parked.map((item) => item.note.id));
  return notes
    .filter((note) => isEligible(note) && !taken.has(note.id) && note.title.trim())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CANDIDATES);
}

/** First non-empty line of the body, for a one-line reminder of the idea. */
export function excerpt(note: Note, max = 120): string {
  const line =
    note.body
      .split('\n')
      .map((l) => l.replace(/^[#>*\-\s]+/, '').trim())
      .find((l) => l.length > 0) ?? '';
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}
