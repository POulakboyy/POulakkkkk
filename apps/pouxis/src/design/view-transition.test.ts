import { afterEach, describe, expect, it, vi } from 'vitest';
import { withViewTransition } from './view-transition.ts';

function setStart(fn: unknown): void {
  Object.defineProperty(document, 'startViewTransition', { value: fn, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(document, 'startViewTransition');
  delete document.documentElement.dataset.theme;
});

describe('withViewTransition', () => {
  it('runs the update directly when the API is missing', async () => {
    const update = vi.fn();
    await withViewTransition(update);
    expect(update).toHaveBeenCalledOnce();
  });

  it('delegates to document.startViewTransition when available', async () => {
    const start = vi.fn((cb: () => void) => {
      cb();
      return { updateCallbackDone: Promise.resolve(), finished: Promise.resolve() };
    });
    setStart(start);
    const update = vi.fn();
    await withViewTransition(update);
    expect(start).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
  });

  it('propagates an error thrown by the update', async () => {
    const error = new Error('boom');
    setStart((cb: () => void) => {
      let updateCallbackDone: Promise<void>;
      try {
        cb();
        updateCallbackDone = Promise.resolve();
      } catch (e) {
        updateCallbackDone = Promise.reject(e);
      }
      return { updateCallbackDone, finished: updateCallbackDone };
    });
    await expect(
      withViewTransition(() => {
        throw error;
      }),
    ).rejects.toBe(error);
  });

  it('skips the animation in the e-ink theme', async () => {
    const start = vi.fn();
    setStart(start);
    document.documentElement.dataset.theme = 'eink';
    const update = vi.fn();
    await withViewTransition(update);
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledOnce();
  });
});
