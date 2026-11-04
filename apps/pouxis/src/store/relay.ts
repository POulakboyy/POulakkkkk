import { sync } from '@pouxis/core';
import { payloadCipher } from './vault.ts';

/** The subset of the WebSocket API the relay connection uses (injectable for tests). */
export interface SocketLike {
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  send(data: string): void;
  close(): void;
}

export type SocketFactory = (url: string) => SocketLike;

export interface RelayOptions {
  replica: sync.Replica;
  /** Relay base address, e.g. `https://sync.example.org` (see `relayUrl`). */
  url: string;
  space: string;
  token: string;
  key: CryptoKey;
  state?: sync.SyncClientState;
  saveState(state: sync.SyncClientState): void;
  /** Any observable change: status, pending count, last sync time, issue. */
  onChange(): void;
  socket?: SocketFactory;
  now?: () => number;
}

export interface RelayIssue {
  code: string;
  message: string;
}

export interface RelayConnection {
  status(): sync.SyncStatus;
  pending(): number;
  lastSyncedAt(): number | undefined;
  issue(): RelayIssue | undefined;
  /** Reconnects now (also after a fatal error, e.g. once the token was fixed). */
  reconnect(): void;
  /** Resolves when every received frame has been processed (tests). */
  idle(): Promise<void>;
  close(): void;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * WebSocket address of the relay. Accepts `https://`, `wss://` and, for a relay on this very
 * machine only, `http://` / `ws://`: the bearer token must never cross a network in clear.
 */
export function relayUrl(base: string): string {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error('Invalid relay address');
  }
  if (url.protocol === 'https:') url.protocol = 'wss:';
  else if (url.protocol === 'http:') url.protocol = 'ws:';
  if (url.protocol === 'ws:' && !LOCAL_HOSTS.has(url.hostname)) {
    throw new Error('The relay must use a secure connection (https or wss)');
  }
  if (url.protocol !== 'wss:' && url.protocol !== 'ws:') throw new Error('Invalid relay address');
  if (url.username || url.password) throw new Error('Credentials do not belong in the address');
  if (!url.pathname.endsWith(sync.PROTOCOL_PATH)) {
    url.pathname = url.pathname.replace(/\/+$/, '') + sync.PROTOCOL_PATH;
  }
  url.hash = '';
  return url.toString();
}

const defaultSocket: SocketFactory = (url) => new WebSocket(url) as unknown as SocketLike;

/**
 * Keeps a replica in sync with a relay: end-to-end encrypted payloads, resumable cursor,
 * reconnection with exponential backoff, immediate retry when the network comes back.
 */
export function connectRelay(options: RelayOptions): RelayConnection {
  const now = options.now ?? Date.now;
  const address = relayUrl(options.url);
  const openSocket = options.socket ?? defaultSocket;
  const cipher = payloadCipher(options.key, options.space);
  let socket: SocketLike | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let fatal = false;
  let lastSyncedAt: number | undefined;
  let lastIssue: RelayIssue | undefined;

  const client = sync.createSyncClient({
    replica: options.replica,
    space: options.space,
    token: options.token,
    ...(options.state ? { state: options.state } : {}),
    send: (message) => socket?.send(sync.encodeClientMessage(message)),
    encrypt: cipher.encrypt,
    decrypt: cipher.decrypt,
    setTimer: (callback, ms) => void setTimeout(callback, ms),
    onStatus(status) {
      if (status === 'live') {
        lastSyncedAt = now();
        lastIssue = undefined;
      }
      options.onChange();
    },
    onIssue(issue) {
      lastIssue = { code: issue.code, message: issue.message };
      if (issue.fatal) fatal = true;
      options.onChange();
    },
    onPersist(state) {
      if (client.status === 'live') lastSyncedAt = now();
      options.saveState(state);
      options.onChange();
    },
  });

  const scheduleRetry = (): void => {
    if (closed || fatal || retryTimer !== undefined) return;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      open();
    }, client.retryDelay());
  };

  function open(): void {
    if (closed || socket) return;
    let ws: SocketLike;
    try {
      ws = openSocket(address);
    } catch {
      scheduleRetry();
      return;
    }
    socket = ws;
    ws.onopen = () => client.connected();
    ws.onmessage = (event) => {
      if (typeof event.data === 'string') void client.receive(event.data);
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      if (socket !== ws) return;
      socket = undefined;
      client.disconnected();
      scheduleRetry();
    };
    options.onChange();
  }

  function drop(): void {
    clearTimeout(retryTimer);
    retryTimer = undefined;
    const ws = socket;
    socket = undefined;
    if (ws) {
      ws.onclose = null;
      ws.close();
      client.disconnected();
    }
  }

  const onOnline = (): void => {
    if (!socket && !fatal) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
      open();
    }
  };
  globalThis.addEventListener?.('online', onOnline);
  open();

  return {
    status: () => (socket && client.status === 'offline' ? 'connecting' : client.status),
    pending: () => client.pending(),
    lastSyncedAt: () => lastSyncedAt,
    issue: () => lastIssue,
    reconnect() {
      fatal = false;
      drop();
      open();
    },
    idle: () => client.idle(),
    close() {
      closed = true;
      globalThis.removeEventListener?.('online', onOnline);
      drop();
      client.dispose();
    },
  };
}
