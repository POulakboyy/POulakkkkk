/** Minimal Web Locks surface (injectable for tests). */
export interface LockManagerLike {
  request(
    name: string,
    options: { ifAvailable: boolean },
    callback: (lock: unknown) => Promise<void> | void,
  ): Promise<unknown>;
}

export interface NodeSlot {
  /** Replica node id: `<device>.<slot>`, unique among the tabs open on this device. */
  node: string;
  release(): void;
}

export const MAX_SLOTS = 32;

export function defaultLocks(): LockManagerLike | undefined {
  const locks = (globalThis.navigator as { locks?: LockManagerLike } | undefined)?.locks;
  return typeof locks?.request === 'function' ? locks : undefined;
}

/**
 * Picks the node id of this tab. Two replicas must never share a node id, yet a device should
 * reuse a small, stable set of ids: the sync client only pushes ops of its own node, so ops
 * written offline under an id are pushed the next time a tab holds that id again. Each tab
 * therefore holds the lowest free slot lock (`pouxis:node:<n>`) for its whole life.
 * Without Web Locks (old engines, tests) the device has a single slot.
 */
export async function acquireNodeSlot(
  device: string,
  locks: LockManagerLike | undefined = defaultLocks(),
): Promise<NodeSlot> {
  if (!locks) return { node: `${device}.0`, release() {} };
  for (let slot = 0; slot < MAX_SLOTS; slot++) {
    const held = await tryHold(locks, `pouxis:node:${slot}`);
    if (held) return { node: `${device}.${slot}`, release: held };
  }
  // Absurd number of tabs: fall back to a throwaway id rather than sharing one.
  return { node: `${device}.t${Math.random().toString(36).slice(2, 10)}`, release() {} };
}

/** Holds the lock until the returned release function is called; undefined when taken. */
function tryHold(locks: LockManagerLike, name: string): Promise<(() => void) | undefined> {
  return new Promise((resolve, reject) => {
    locks
      .request(name, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(undefined);
          return;
        }
        return new Promise<void>((release) => resolve(release));
      })
      .catch(reject);
  });
}
