/**
 * Block-level documents (3.3) on top of a replica. Each block is a record of a dedicated
 * collection with stable id and LWW fields: `doc`, `type`, `text`, `pos` (fractional index)
 * and the type attributes (`level`, `checked`, `lang`, `indent`). Hence concurrent edits of
 * different blocks — or of different fields of one block, e.g. ticking a to-do while its text
 * is edited — all merge; concurrent edits of the same text keep the latest one, and every
 * observed version stays in the block history.
 *
 * Order: blocks sort by `pos`, then by id. Insert and move only write the block's own `pos`.
 */
import { createId as defaultCreateId } from '../id.ts';
import { SyncError } from './errors.ts';
import { between, isValidOrderKey, spread } from './fractional.ts';
import {
  fromMarkdown,
  isBlockType,
  normalizeBlock,
  toMarkdown,
  type BlockContent,
  type BlockInput,
} from './markdown.ts';
import type { Op } from './ops.ts';
import type { HistoryEntry, Patch, RecordValue, Replica } from './replica.ts';

export const DEFAULT_BLOCK_COLLECTION = 'blocks';
/** `history` option for `createReplica` that keeps the text history of blocks. */
export const BLOCK_HISTORY: { readonly [collection: string]: readonly string[] } = Object.freeze({
  [DEFAULT_BLOCK_COLLECTION]: Object.freeze(['text']),
});

export type Block = BlockContent & {
  readonly id: string;
  /** Fractional order key. */
  readonly pos: string;
};

/** Where to put a block: after a block (`null` = at the start) or before one (`null` = end). */
export type Placement = { readonly after: string | null } | { readonly before: string | null };

export interface BlockDocOptions {
  collection?: string;
  /** Random source for order-key jitter. */
  random?: () => number;
  createId?: () => string;
}

export interface BlockDoc {
  readonly id: string;
  /** Blocks in document order. */
  blocks(): Block[];
  get(blockId: string): Block | undefined;
  /** Inserts a block (default: at the end) and returns it with the ops produced. */
  insert(input: BlockInput, placement?: Placement): { block: Block; ops: Op[] };
  update(blockId: string, input: BlockInput): Op[];
  move(blockId: string, placement: Placement): Op[];
  remove(blockId: string): Op[];
  /** Text versions of a block observed by this replica, oldest first. */
  blockHistory(blockId: string): HistoryEntry[];
  toMarkdown(): string;
  /**
   * Replaces the content with a Markdown document, reusing existing blocks where possible
   * (unchanged blocks are untouched, changed ones are edited in place) so ids, history and
   * concurrent edits of untouched blocks survive.
   */
  setMarkdown(markdown: string): Op[];
}

const ATTRIBUTES = ['type', 'text', 'level', 'checked', 'lang', 'indent'] as const;

export function createBlockDoc(
  replica: Replica,
  docId: string,
  options: BlockDocOptions = {},
): BlockDoc {
  if (!docId) throw new SyncError('invalid', 'document id is required');
  const collection = options.collection ?? DEFAULT_BLOCK_COLLECTION;
  const createId = options.createId ?? defaultCreateId;
  const keyOptions = options.random ? { random: options.random } : {};

  const list = (): Block[] => {
    const out: Block[] = [];
    for (const [id, value] of replica.all(collection)) {
      if (value['doc'] === docId) out.push(toBlock(id, value));
    }
    return out.sort(compareBlocks);
  };

  const write = (id: string, patch: Patch): Op[] => replica.change(collection, id, patch);

  /** Order key for a block placed at `placement` in `blocks` (which excludes that block). */
  const place = (blocks: readonly Block[], placement: Placement): { pos: string; ops: Op[] } => {
    const index = insertionIndex(blocks, placement);
    const lo = blocks[index - 1]?.pos ?? null;
    let hi = blocks[index]?.pos ?? null;
    if (lo === null || hi === null || lo < hi) return { pos: between(lo, hi, keyOptions), ops: [] };
    // Equal keys (concurrent inserts that drew the same jitter): re-space the tied run.
    let end = index;
    while (end < blocks.length && (blocks[end] as Block).pos <= lo) end++;
    hi = blocks[end]?.pos ?? null;
    const pos = between(lo, hi, keyOptions);
    const keys = spread(pos, hi, end - index);
    const ops = blocks
      .slice(index, end)
      .flatMap((block, i) => write(block.id, { pos: keys[i] as string }));
    return { pos, ops };
  };

  const require = (blockId: string): Block => {
    const block = doc.get(blockId);
    if (!block) throw new SyncError('invalid', `unknown block: ${blockId}`);
    return block;
  };

  const doc: BlockDoc = {
    id: docId,
    blocks: list,

    get(blockId) {
      const value = replica.get(collection, blockId);
      return value && value['doc'] === docId ? toBlock(blockId, value) : undefined;
    },

    insert(input, placement = { before: null }) {
      const id = createId();
      const { pos, ops } = place(list(), placement);
      const content = normalizeBlock(input);
      ops.push(...write(id, { doc: docId, pos, ...contentPatch(content) }));
      return { block: { ...content, id, pos }, ops };
    },

    update(blockId, input) {
      const current = require(blockId);
      const merged = normalizeBlock({ ...stripPosition(current), ...input });
      return write(blockId, contentPatch(merged));
    },

    move(blockId, placement) {
      require(blockId);
      const others = list().filter((block) => block.id !== blockId);
      const { pos, ops } = place(others, placement);
      return [...ops, ...write(blockId, { pos })];
    },

    remove(blockId) {
      require(blockId);
      return replica.change(collection, blockId, 'delete');
    },

    blockHistory(blockId) {
      return replica.history(collection, blockId, 'text');
    },

    toMarkdown() {
      return toMarkdown(list());
    },

    setMarkdown(markdown) {
      return applyMarkdown(list(), fromMarkdown(markdown));
    },
  };

  /** Aligns the current blocks with the target content and writes the difference. */
  const applyMarkdown = (current: readonly Block[], target: readonly BlockContent[]): Op[] => {
    const ops: Op[] = [];
    const final: Array<{ block?: Block; content: BlockContent }> = [];
    const pairs = alignBlocks(current, target);
    for (const [oldIndex, newIndex] of pairs) {
      const old = oldIndex === undefined ? undefined : current[oldIndex];
      const content = newIndex === undefined ? undefined : target[newIndex];
      if (old && !content) ops.push(...replica.change(collection, old.id, 'delete'));
      else if (content) {
        if (old) ops.push(...write(old.id, contentPatch(content)));
        final.push(old ? { block: old, content } : { content });
      }
    }
    const kept = final.filter((entry) => entry.block).map((entry) => entry.block as Block);
    const increasing = kept.every((block, i) => i === 0 || (kept[i - 1] as Block).pos < block.pos);
    if (!increasing) {
      // Tied keys among kept blocks: re-space the whole document.
      const keys = spread(null, null, final.length);
      final.forEach((entry, i) => {
        const pos = keys[i] as string;
        if (entry.block) ops.push(...write(entry.block.id, { pos }));
        else ops.push(...write(createId(), { doc: docId, pos, ...contentPatch(entry.content) }));
      });
      return ops;
    }
    let lo: string | null = null;
    for (let i = 0; i < final.length;) {
      const entry = final[i] as (typeof final)[number];
      if (entry.block) {
        lo = entry.block.pos;
        i++;
        continue;
      }
      let end = i;
      while (end < final.length && !(final[end] as (typeof final)[number]).block) end++;
      const hi = final[end]?.block?.pos ?? null;
      const keys = spread(lo, hi, end - i);
      for (let j = i; j < end; j++) {
        const content = (final[j] as (typeof final)[number]).content;
        const pos = keys[j - i] as string;
        ops.push(...write(createId(), { doc: docId, pos, ...contentPatch(content) }));
      }
      i = end;
    }
    return ops;
  };

  return doc;
}

function compareBlocks(a: Block, b: Block): number {
  if (a.pos !== b.pos) return a.pos < b.pos ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Reads a block from untrusted record fields (any replica may have written them). */
function toBlock(id: string, value: RecordValue): Block {
  const pos = value['pos'];
  const content = normalizeBlock({
    type: isBlockType(value['type']) ? value['type'] : 'paragraph',
    text: typeof value['text'] === 'string' ? value['text'] : '',
    ...numberField('level', value['level']),
    ...(typeof value['checked'] === 'boolean' ? { checked: value['checked'] } : {}),
    ...(typeof value['lang'] === 'string' ? { lang: value['lang'] } : {}),
    ...numberField('indent', value['indent']),
  });
  // Blocks with a malformed key sort last ("~" is above every digit).
  return { ...content, id, pos: isValidOrderKey(pos) ? pos : '~' };
}

function numberField(
  name: 'level' | 'indent',
  value: unknown,
): { level?: number; indent?: number } {
  return typeof value === 'number' ? { [name]: value } : {};
}

function stripPosition(block: Block): BlockContent {
  const { id: _id, pos: _pos, ...content } = block;
  return content;
}

/** Patch writing every attribute (absent ones unset, so stale attributes never linger). */
function contentPatch(content: BlockContent): Patch {
  const patch: { [field: string]: unknown } = {};
  for (const name of ATTRIBUTES) patch[name] = content[name];
  return patch;
}

function insertionIndex(blocks: readonly Block[], placement: Placement): number {
  const anchor = 'after' in placement ? placement.after : placement.before;
  if (anchor === null) return 'after' in placement ? 0 : blocks.length;
  const index = blocks.findIndex((block) => block.id === anchor);
  if (index < 0) throw new SyncError('invalid', `unknown anchor block: ${anchor}`);
  return 'after' in placement ? index + 1 : index;
}

function contentKey(content: BlockContent): string {
  return JSON.stringify(ATTRIBUTES.map((name) => content[name] ?? null));
}

/**
 * Pairs old and new blocks: a longest common subsequence of identical blocks, then, inside
 * each gap, old and new blocks pairwise in order (edited in place). Unpaired old blocks are
 * removed, unpaired new ones inserted. Returns `[oldIndex?, newIndex?]` in document order.
 */
function alignBlocks(
  current: readonly Block[],
  target: readonly BlockContent[],
): Array<[number | undefined, number | undefined]> {
  const a = current.map((block) => contentKey(block));
  const b = target.map(contentKey);
  const n = a.length;
  const m = b.length;
  const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    const row = lcs[i] as Uint32Array;
    const below = lcs[i + 1] as Uint32Array;
    for (let j = m - 1; j >= 0; j--) {
      row[j] =
        a[i] === b[j]
          ? (below[j + 1] as number) + 1
          : Math.max(below[j] as number, row[j + 1] as number);
    }
  }
  const out: Array<[number | undefined, number | undefined]> = [];
  let gapOld: number[] = [];
  let gapNew: number[] = [];
  const flush = (): void => {
    const count = Math.max(gapOld.length, gapNew.length);
    for (let k = 0; k < count; k++) out.push([gapOld[k], gapNew[k]]);
    gapOld = [];
    gapNew = [];
  };
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      flush();
      out.push([i++, j++]);
    } else if (j >= m || (i < n && (lcs[i + 1]?.[j] ?? 0) >= (lcs[i]?.[j + 1] ?? 0))) {
      gapOld.push(i++);
    } else {
      gapNew.push(j++);
    }
  }
  flush();
  return out;
}
