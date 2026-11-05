/**
 * Warms code-split chunks before they are needed: on hover or focus of a navigation link, and
 * one chunk per idle period after the shell has painted. Each loader runs at most once; a
 * failed load is forgotten so a later attempt (the real navigation) retries it.
 */

export type Loader = () => Promise<unknown>;

const inflight = new Map<Loader, Promise<void>>();

/**
 * Starts `load` unless it already ran and resolves once it settles. Never rejects: the lazy
 * component that needs the chunk reports the error itself.
 */
export function prefetch(load: Loader): Promise<void> {
  let pending = inflight.get(load);
  if (!pending) {
    pending = load().then(
      () => undefined,
      () => void inflight.delete(load),
    );
    inflight.set(load, pending);
  }
  return pending;
}

export interface IdleScheduler {
  request(callback: () => void): number;
  cancel(handle: number): void;
}

type IdleGlobal = {
  requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/** `requestIdleCallback` where available (not in WebKit), else a short timeout. */
export function defaultIdleScheduler(): IdleScheduler {
  const g = globalThis as IdleGlobal;
  if (g.requestIdleCallback && g.cancelIdleCallback) {
    const { requestIdleCallback: request, cancelIdleCallback: cancel } = g;
    return { request: (cb) => request(cb, { timeout: 4000 }), cancel: (h) => cancel(h) };
  }
  return {
    request: (cb) => setTimeout(cb, 300) as unknown as number,
    cancel: (h) => clearTimeout(h),
  };
}

/** Data saver or a 2G link: leave the network to what the user asked for. */
export function shouldSaveData(nav: unknown = globalThis.navigator): boolean {
  const connection = (nav as { connection?: { saveData?: boolean; effectiveType?: string } })
    ?.connection;
  return !!connection && (connection.saveData === true || /2g/.test(connection.effectiveType ?? ''));
}

/**
 * Runs `loaders` one per idle period, in order, waiting for each to settle so chunk evaluation
 * never piles up on the main thread. Returns a function that stops the queue.
 */
export function prefetchWhenIdle(
  loaders: readonly Loader[],
  scheduler: IdleScheduler = defaultIdleScheduler(),
): () => void {
  let index = 0;
  let handle: number | null = null;
  let stopped = false;
  const next = () => {
    if (stopped || index >= loaders.length) return;
    handle = scheduler.request(() => {
      handle = null;
      const load = loaders[index++];
      if (load) void prefetch(load).then(next);
    });
  };
  next();
  return () => {
    stopped = true;
    if (handle !== null) scheduler.cancel(handle);
  };
}
