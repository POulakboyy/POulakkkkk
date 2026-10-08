/**
 * In-memory storage (tests, development). Data survives log close/re-open but not the
 * process.
 */
import type { Envelope, StoredEnvelope } from '../protocol.ts';
import {
  QuotaExceededError,
  recordBytes,
  type AppendOptions,
  type AppendOutcome,
  type SpaceLog,
  type Storage,
} from './types.ts';

interface SpaceData {
  entries: StoredEnvelope[];
  /** Serialized size of each entry, parallel to `entries`. */
  sizes: number[];
  ids: Set<string>;
  bytes: number;
}

export class MemoryStorage implements Storage {
  private readonly spaces = new Map<string, SpaceData>();
  private readonly open_ = new Set<string>();

  async open(space: string): Promise<SpaceLog> {
    if (this.open_.has(space)) throw new Error('space log is already open');
    let data = this.spaces.get(space);
    if (!data) {
      data = { entries: [], sizes: [], ids: new Set(), bytes: 0 };
      this.spaces.set(space, data);
    }
    this.open_.add(space);
    return new MemorySpaceLog(data, () => this.open_.delete(space));
  }

  async close(): Promise<void> {
    this.open_.clear();
  }
}

class MemorySpaceLog implements SpaceLog {
  private readonly data: SpaceData;
  private readonly onClose: () => void;
  private closed = false;

  constructor(data: SpaceData, onClose: () => void) {
    this.data = data;
    this.onClose = onClose;
  }

  get head(): number {
    return this.data.entries.length;
  }

  get bytes(): number {
    return this.data.bytes;
  }

  async append(envelopes: readonly Envelope[], options: AppendOptions = {}): Promise<AppendOutcome> {
    this.assertOpen();
    const stored: StoredEnvelope[] = [];
    const sizes: number[] = [];
    const duplicates: string[] = [];
    const batchIds = new Set<string>();
    let addedBytes = 0;
    for (const envelope of envelopes) {
      if (this.data.ids.has(envelope.id) || batchIds.has(envelope.id)) {
        duplicates.push(envelope.id);
        continue;
      }
      batchIds.add(envelope.id);
      const entry: StoredEnvelope = {
        id: envelope.id,
        hlc: envelope.hlc,
        node: envelope.node,
        payload: envelope.payload,
        seq: this.data.entries.length + stored.length + 1,
      };
      const size = recordBytes(entry);
      addedBytes += size;
      sizes.push(size);
      stored.push(entry);
    }
    const maxBytes = options.maxBytes ?? 0;
    if (stored.length > 0 && maxBytes > 0 && this.data.bytes + addedBytes > maxBytes) {
      throw new QuotaExceededError();
    }
    stored.forEach((entry, i) => {
      this.data.entries.push({ ...entry });
      this.data.sizes.push(sizes[i] ?? 0);
      this.data.ids.add(entry.id);
    });
    this.data.bytes += addedBytes;
    return { stored, duplicates, head: this.data.entries.length };
  }

  async read(afterSeq: number, limit: number, maxBytes: number): Promise<StoredEnvelope[]> {
    this.assertOpen();
    const out: StoredEnvelope[] = [];
    let bytes = 0;
    for (let seq = afterSeq + 1; seq <= this.data.entries.length && out.length < limit; seq++) {
      const entry = this.data.entries[seq - 1];
      const size = this.data.sizes[seq - 1];
      if (!entry || size === undefined) break;
      if (out.length > 0 && bytes + size > maxBytes) break;
      bytes += size;
      out.push({ ...entry });
    }
    return out;
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.onClose();
  }

  private assertOpen(): void {
    if (this.closed) throw new Error('space log is closed');
  }
}
