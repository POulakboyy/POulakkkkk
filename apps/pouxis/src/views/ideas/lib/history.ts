/**
 * Block history (3.3): snapshots of a note's lines taken each time the writer leaves a line.
 * Lines that existed in a snapshot but no longer exist are offered for restoration — earlier
 * versions of a paragraph as well as deleted ones. Kept in memory for the session only.
 */

export interface Snapshot {
  at: number;
  lines: readonly string[];
}

export interface LostBlock {
  text: string;
  /** Line index the block had in its snapshot (used to put it back near its place). */
  index: number;
  /** When the block was last seen. */
  at: number;
}

const MAX_SNAPSHOTS = 50;

/** Appends a snapshot unless it is identical to the latest one. Keeps the newest `max`. */
export function pushSnapshot(
  snapshots: readonly Snapshot[],
  lines: readonly string[],
  at: number,
  max = MAX_SNAPSHOTS,
): Snapshot[] {
  const last = snapshots[snapshots.length - 1];
  if (last && sameLines(last.lines, lines)) return snapshots.slice();
  return [...snapshots, { at, lines: lines.slice() }].slice(-max);
}

function sameLines(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((line, i) => line === b[i]);
}

/** Non-blank lines of past snapshots missing from `current`, most recently seen first. */
export function lostBlocks(
  current: readonly string[],
  snapshots: readonly Snapshot[],
  limit = 20,
): LostBlock[] {
  const present = new Set(current.map((l) => l.trim()));
  const seen = new Set<string>();
  const out: LostBlock[] = [];
  for (let s = snapshots.length - 1; s >= 0 && out.length < limit; s--) {
    const snap = snapshots[s];
    if (!snap) continue;
    snap.lines.forEach((line, index) => {
      const key = line.trim();
      if (!key || present.has(key) || seen.has(key) || out.length >= limit) return;
      seen.add(key);
      out.push({ text: line, index, at: snap.at });
    });
  }
  return out;
}

/** Puts a lost block back at its former index (clamped to the end of the note). */
export function restoreBlock(lines: readonly string[], block: LostBlock): string[] {
  const next = lines.slice();
  const index = Math.min(Math.max(0, block.index), next.length);
  next.splice(index, 0, block.text);
  return next;
}

const sessions = new Map<string, Snapshot[]>();

/** Session-wide history store, keyed by note id. */
export const noteHistory = {
  get(noteId: string): readonly Snapshot[] {
    return sessions.get(noteId) ?? [];
  },
  record(noteId: string, lines: readonly string[], at: number): void {
    sessions.set(noteId, pushSnapshot(sessions.get(noteId) ?? [], lines, at));
  },
  clear(noteId?: string): void {
    if (noteId === undefined) sessions.clear();
    else sessions.delete(noteId);
  },
};
