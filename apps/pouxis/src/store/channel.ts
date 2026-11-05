import type { sync } from '@pouxis/core';

/** Messages exchanged between tabs that share the same local database. */
export type TabMessage =
  | { t: 'ops'; from: string; ops: sync.Op[] }
  | { t: 'hello'; from: string; vv: sync.VersionVector }
  | { t: 'wipe'; from: string };

/** Minimal BroadcastChannel surface (injectable for tests). */
export interface ChannelLike {
  onmessage: ((event: { data: unknown }) => void) | null;
  postMessage(message: unknown): void;
  close(): void;
}

export interface TabSync {
  /** Broadcasts local ops to the other tabs. */
  publish(ops: readonly sync.Op[]): void;
  /** Tells the other tabs that this device's data was erased. */
  publishWipe(): void;
  /** Stops handling messages but keeps the channel open (to reconnect another replica). */
  detach(): void;
  close(): void;
}

export interface TabHandlers {
  /** Ops broadcast by another tab (untrusted: `replica.apply` validates them). */
  receive(ops: sync.Op[]): void;
  /** Another tab erased the device's data. */
  wiped(): void;
}

export const DEFAULT_CHANNEL_NAME = 'pouxis:replica';

export function openBroadcastChannel(name: string = DEFAULT_CHANNEL_NAME): ChannelLike | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  const channel = new BroadcastChannel(name) as BroadcastChannel & { unref?: () => void };
  channel.unref?.();
  return channel as unknown as ChannelLike;
}

function isTabMessage(data: unknown): data is TabMessage {
  if (typeof data !== 'object' || data === null) return false;
  const msg = data as { t?: unknown; from?: unknown; ops?: unknown; vv?: unknown };
  if (typeof msg.from !== 'string') return false;
  if (msg.t === 'ops') return Array.isArray(msg.ops);
  if (msg.t === 'wipe') return true;
  return msg.t === 'hello' && typeof msg.vv === 'object' && msg.vv !== null;
}

/**
 * Cross-tab replication: every tab broadcasts its local ops; a tab that opens announces its
 * version vector and the others answer with what it misses (ops not yet on disk).
 */
export function connectTabs(
  replica: sync.Replica,
  channel: ChannelLike,
  handlers: TabHandlers,
): TabSync {
  const node = replica.node;
  channel.onmessage = (event) => {
    const msg = event.data;
    if (!isTabMessage(msg) || msg.from === node) return;
    if (msg.t === 'wipe') {
      handlers.wiped();
      return;
    }
    if (msg.t === 'hello') {
      const missing = replica.opsSince(msg.vv);
      if (missing.length > 0) channel.postMessage({ t: 'ops', from: node, ops: missing });
      return;
    }
    try {
      handlers.receive(msg.ops as sync.Op[]);
    } catch {
      // A malformed batch from another tab (older app version): ignore it, disk has the truth.
    }
  };
  channel.postMessage({ t: 'hello', from: node, vv: replica.versionVector() });
  return {
    publish(ops) {
      if (ops.length > 0) channel.postMessage({ t: 'ops', from: node, ops: [...ops] });
    },
    publishWipe() {
      channel.postMessage({ t: 'wipe', from: node });
    },
    detach() {
      channel.onmessage = null;
    },
    close() {
      channel.onmessage = null;
      channel.close();
    },
  };
}
