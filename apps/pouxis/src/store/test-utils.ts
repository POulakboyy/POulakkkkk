/** Test doubles for the store: linked tab channels and an in-memory relay. */
import type { ChannelLike } from './channel.ts';
import type { SocketFactory, SocketLike } from './relay.ts';

/** A broadcast bus whose channels deliver asynchronously to every other member, like tabs. */
export function createBus(): { channel(): ChannelLike; settle(): Promise<void> } {
  const members = new Set<ChannelLike>();
  let inFlight = Promise.resolve();
  return {
    channel() {
      const self: ChannelLike = {
        onmessage: null,
        postMessage(message) {
          const copy = structuredClone(message);
          for (const other of members) {
            if (other === self) continue;
            inFlight = inFlight.then(() => other.onmessage?.({ data: copy }));
          }
        },
        close() {
          members.delete(self);
        },
      };
      members.add(self);
      return self;
    },
    async settle() {
      for (let i = 0; i < 5; i++) {
        await inFlight;
        await new Promise((r) => setTimeout(r, 0));
      }
    },
  };
}

interface StoredEnvelope {
  id: string;
  hlc: string;
  node: string;
  payload: string;
  seq: number;
}

/**
 * Minimal relay following the wire protocol: one log per space, idempotent on envelope id,
 * no echo of a connection's own pushes, bearer token check.
 */
export function createFakeRelay(token: string): {
  socket: SocketFactory;
  log(space: string): readonly StoredEnvelope[];
  connections(): number;
  dropAll(): void;
} {
  const logs = new Map<string, StoredEnvelope[]>();
  const live = new Set<{ space: string; socket: SocketLike; deliver(e: StoredEnvelope[]): void }>();

  const socket: SocketFactory = () => {
    const ws: SocketLike = {
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      send(data) {
        setTimeout(() => handle(JSON.parse(data) as Record<string, unknown>), 0);
      },
      close() {
        if (session) live.delete(session);
        setTimeout(() => ws.onclose?.({}), 0);
      },
    };
    let session: { space: string; socket: SocketLike; deliver(e: StoredEnvelope[]): void } | null =
      null;
    const reply = (msg: unknown): void => {
      setTimeout(() => ws.onmessage?.({ data: JSON.stringify(msg) }), 0);
    };
    const cursorOf = (space: string): string => String(logs.get(space)?.length ?? 0);

    function handle(msg: Record<string, unknown>): void {
      if (msg.t === 'hello') {
        if (msg.token !== token) {
          reply({ t: 'error', code: 'unauthorized', message: 'bad token' });
          return;
        }
        const space = String(msg.space);
        const log = logs.get(space) ?? [];
        logs.set(space, log);
        session = {
          space,
          socket: ws,
          deliver: (envelopes) => reply({ t: 'ops', envelopes, cursor: cursorOf(space) }),
        };
        live.add(session);
        reply({ t: 'welcome', cursor: cursorOf(space) });
        const since = msg.since === null ? 0 : Number(msg.since);
        const backlog = log.slice(since);
        if (backlog.length > 0) session.deliver(backlog);
        return;
      }
      if (msg.t === 'push' && session) {
        const log = logs.get(session.space) ?? [];
        const fresh: StoredEnvelope[] = [];
        const ids: string[] = [];
        for (const e of msg.envelopes as Omit<StoredEnvelope, 'seq'>[]) {
          ids.push(e.id);
          if (log.some((x) => x.id === e.id)) continue;
          const stored = { ...e, seq: log.length + 1 };
          log.push(stored);
          fresh.push(stored);
        }
        reply({ t: 'ack', ids, cursor: cursorOf(session.space) });
        for (const other of live) {
          if (other !== session && other.space === session.space && fresh.length > 0) {
            other.deliver(fresh);
          }
        }
      }
    }

    setTimeout(() => ws.onopen?.({}), 0);
    return ws;
  };

  return {
    socket,
    log: (space) => logs.get(space) ?? [],
    connections: () => live.size,
    dropAll() {
      for (const s of [...live]) s.socket.close();
    },
  };
}

/** Polls `check` until it holds (real timers), failing after `timeoutMs`. */
export async function until(check: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 5));
  }
}
