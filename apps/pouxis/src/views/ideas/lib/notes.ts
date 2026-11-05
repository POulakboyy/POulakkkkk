/** Pure helpers over notes and journal entries used across the ideas view. */
import type { Id, JournalEntry, Note, Task } from '@pouxis/core';
import { insights, startOfWeek, type TimeZone } from '@pouxis/core';
import type { NewRecord } from '../../../store/index.ts';
import { parseLine, plainText } from './markdown.ts';

export const ARCHIVED_TAG = 'archived';
export const RESOLVED_TAG = 'resolved';
export const FRICTION_KINDS = ['technical', 'creative', 'external', 'other'] as const;
export type FrictionKind = (typeof FRICTION_KINDS)[number];

const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Notes shown in the main list: no sandbox, vault or archived note; most recent first. */
export function visibleNotes(notes: readonly Note[], query = ''): Note[] {
  const q = fold(query.trim());
  return notes
    .filter((n) => !n.sandbox && !n.vaultId && !n.tags.includes(ARCHIVED_TAG))
    .filter((n) => !q || fold(`${n.title}\n${n.body}`).includes(q))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Notes that wiki links and backlinks may point to: everything but sandbox and vault notes. */
export function linkableNotes(notes: readonly Note[]): Note[] {
  return notes.filter((n) => !n.sandbox && !n.vaultId);
}

/** First meaningful body line, without Markdown, for list rows. */
export function excerpt(body: string, max = 120): string {
  for (const line of body.split('\n')) {
    const block = parseLine(line);
    if (block.kind === 'blank' || block.kind === 'rule' || block.kind === 'heading') continue;
    const text = plainText(line);
    if (text) return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
  }
  return '';
}

/** Title for a note kept from a draft: its first non-blank line, without Markdown. */
export function titleFromBody(body: string, max = 80): string {
  const first = body.split('\n').find((l) => l.trim()) ?? '';
  const text = plainText(first);
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Links two notes both ways (5.1 « Les relier »). Returns the patches to apply. */
export function linkPatches(a: Note, b: Note): Array<{ id: Id; links: Id[] }> {
  const add = (from: Note, to: Id) => (from.links.includes(to) ? from.links : [...from.links, to]);
  return [
    { id: a.id, links: add(a, b.id) },
    { id: b.id, links: add(b, a.id) },
  ];
}

/** Brain dump (5.14): one idea per non-blank line, list markers removed. */
export function splitIdeas(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^(?:[-*+•]|\d+[.)])\s+/, '')
        .trim(),
    )
    .filter(Boolean);
}

export function inboxTask(title: string): NewRecord<'tasks'> {
  return {
    title,
    status: 'inbox',
    priority: 0,
    tags: [],
    dependsOn: [],
    mode: 'create',
    postponedCount: 0,
    timeLogs: [],
  } satisfies Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
}

export function frictionKind(entry: JournalEntry): FrictionKind {
  return FRICTION_KINDS.find((k) => entry.tags.includes(k)) ?? 'other';
}

/** Friction entries, open ones first, newest first within each group. */
export function sortFriction(journal: readonly JournalEntry[]): JournalEntry[] {
  return journal
    .filter((e) => e.kind === 'friction')
    .sort(
      (a, b) =>
        Number(a.tags.includes(RESOLVED_TAG)) - Number(b.tags.includes(RESOLVED_TAG)) ||
        b.createdAt - a.createdAt,
    );
}

/** Ids of friction entries that belong to a recurring blocker (insights.weeklyReview). */
export function recurringFriction(
  journal: readonly JournalEntry[],
  now: number,
  timeZone: TimeZone,
): Set<Id> {
  const review = insights.weeklyReview({
    tasks: [],
    events: [],
    journal,
    weekStart: startOfWeek(now, timeZone),
    timeZone,
    now,
  });
  return new Set(review.blockers.flatMap((b) => b.entryIds));
}
