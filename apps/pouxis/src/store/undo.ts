/** One record's fields before and after a local change (`undefined` = field absent). */
export interface FieldChange {
  collection: string;
  id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export interface UndoEntry {
  changes: FieldChange[];
  label?: string;
  at: number;
  /** Consecutive edits of the same fields may merge into this entry. */
  coalescible: boolean;
}

export interface UndoStackOptions {
  limit?: number;
  /** Edits of the same record fields closer than this merge into one step (typing). */
  coalesceMs?: number;
}

/**
 * Undo/redo history of local changes. Pure bookkeeping: the store applies the entries.
 * New entries clear the redo stack; successive edits of the same fields of one record within
 * `coalesceMs` merge, so undo reverts a typing burst rather than a single keystroke.
 */
export class UndoStack {
  private readonly undoList: UndoEntry[] = [];
  private readonly redoList: UndoEntry[] = [];
  private readonly limit: number;
  private readonly coalesceMs: number;

  constructor(options: UndoStackOptions = {}) {
    this.limit = options.limit ?? 100;
    this.coalesceMs = options.coalesceMs ?? 1000;
  }

  get canUndo(): boolean {
    return this.undoList.length > 0;
  }

  get canRedo(): boolean {
    return this.redoList.length > 0;
  }

  peekUndo(): UndoEntry | undefined {
    return this.undoList[this.undoList.length - 1];
  }

  peekRedo(): UndoEntry | undefined {
    return this.redoList[this.redoList.length - 1];
  }

  push(entry: UndoEntry): void {
    if (entry.changes.length === 0) return;
    this.redoList.length = 0;
    const last = this.peekUndo();
    if (last && this.canMerge(last, entry)) {
      const [prev] = last.changes;
      const [next] = entry.changes;
      if (prev && next) prev.after = next.after;
      last.at = entry.at;
      return;
    }
    this.undoList.push(entry);
    if (this.undoList.length > this.limit) this.undoList.shift();
  }

  /** Moves the newest entry to the redo stack and returns it. */
  takeUndo(): UndoEntry | undefined {
    const entry = this.undoList.pop();
    if (entry) this.redoList.push({ ...entry, coalescible: false });
    return entry;
  }

  /** Moves the newest undone entry back to the undo stack and returns it. */
  takeRedo(): UndoEntry | undefined {
    const entry = this.redoList.pop();
    if (entry) this.undoList.push({ ...entry, coalescible: false });
    return entry;
  }

  clear(): void {
    this.undoList.length = 0;
    this.redoList.length = 0;
  }

  private canMerge(last: UndoEntry, next: UndoEntry): boolean {
    if (!last.coalescible || !next.coalescible) return false;
    if (last.changes.length !== 1 || next.changes.length !== 1) return false;
    if (next.at - last.at > this.coalesceMs) return false;
    const [a] = last.changes;
    const [b] = next.changes;
    if (!a || !b || a.collection !== b.collection || a.id !== b.id) return false;
    const keysA = Object.keys(a.after).sort();
    const keysB = Object.keys(b.after).sort();
    return keysA.length === keysB.length && keysA.every((k, i) => k === keysB[i]);
  }
}

/** Structural equality of JSON-like values (`undefined` equals an absent field). */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => sameJson(v, b[i]));
  }
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ra), ...Object.keys(rb)]);
  for (const k of keys) if (!sameJson(ra[k], rb[k])) return false;
  return true;
}
