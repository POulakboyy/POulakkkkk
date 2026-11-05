import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useZenIdle } from './zen.ts';

const html = document.documentElement;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useZenIdle', () => {
  it('goes idle after 3 s by default and wakes on input', () => {
    const { result, unmount } = renderHook(() => useZenIdle({ enabled: true }));
    act(() => vi.advanceTimersByTime(2999));
    expect(html.dataset.zen).toBeUndefined();
    act(() => vi.advanceTimersByTime(1));
    expect(html.dataset.zen).toBe('idle');
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('pointermove'));
    });
    expect(html.dataset.zen).toBeUndefined();
    expect(result.current).toBe(false);
    unmount();
  });

  it('every input restarts the countdown', () => {
    const { unmount } = renderHook(() => useZenIdle({ enabled: true, delayMs: 1000 }));
    act(() => vi.advanceTimersByTime(800));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });
    act(() => vi.advanceTimersByTime(800));
    expect(html.dataset.zen).toBeUndefined();
    act(() => vi.advanceTimersByTime(200));
    expect(html.dataset.zen).toBe('idle');
    unmount();
  });

  it('is inert when disabled and cleans up when turned off', () => {
    const { rerender, unmount } = renderHook((p: { enabled: boolean }) => useZenIdle(p), {
      initialProps: { enabled: true },
    });
    act(() => vi.advanceTimersByTime(3000));
    expect(html.dataset.zen).toBe('idle');
    rerender({ enabled: false });
    expect(html.dataset.zen).toBeUndefined();
    act(() => vi.advanceTimersByTime(10_000));
    expect(html.dataset.zen).toBeUndefined();
    unmount();
  });

  it('stays awake when the user prefers reduced motion', () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q.includes('reduce'),
    })) as typeof window.matchMedia;
    const { unmount } = renderHook(() => useZenIdle({ enabled: true }));
    act(() => vi.advanceTimersByTime(5000));
    expect(html.dataset.zen).toBeUndefined();
    unmount();
    window.matchMedia = original;
  });

  it('can target another root element', () => {
    const el = document.createElement('div');
    const { unmount } = renderHook(() => useZenIdle({ enabled: true, root: el, delayMs: 10 }));
    act(() => vi.advanceTimersByTime(10));
    expect(el.dataset.zen).toBe('idle');
    expect(html.dataset.zen).toBeUndefined();
    unmount();
    expect(el.dataset.zen).toBeUndefined();
  });
});
