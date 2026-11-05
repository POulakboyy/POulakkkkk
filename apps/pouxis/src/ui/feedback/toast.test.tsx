import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shouldDismissToast, Toaster } from './Toaster.tsx';
import {
  defaultDuration,
  dismissToast,
  getToasts,
  latestActionToast,
  MAX_TOASTS,
  runToastAction,
  toast,
} from './toastStore.ts';

beforeEach(() => dismissToast());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('toast store', () => {
  it('queues, replaces by id and caps the queue', () => {
    toast({ title: 'A', id: 'x' });
    toast({ title: 'B', id: 'x' });
    expect(getToasts().map((t) => t.title)).toEqual(['B']);
    for (let i = 0; i < 10; i++) toast({ title: `T${i}` });
    expect(getToasts()).toHaveLength(MAX_TOASTS);
  });

  it('runs an action once and dismisses', () => {
    const undo = vi.fn();
    const id = toast({ title: 'Archivé', action: { label: 'Annuler', onClick: undo } });
    expect(latestActionToast()?.id).toBe(id);
    expect(runToastAction(id)).toBe(true);
    expect(runToastAction(id)).toBe(false);
    expect(undo).toHaveBeenCalledTimes(1);
    expect(getToasts()).toHaveLength(0);
  });

  it('gives actions more time', () => {
    expect(defaultDuration({})).toBe(5000);
    expect(defaultDuration({ action: { label: 'x', onClick: () => {} } })).toBe(8000);
    expect(defaultDuration({ duration: 1000 })).toBe(1000);
  });

  it('decides swipe dismissal from distance or flick', () => {
    expect(shouldDismissToast(150, 0, 400)).toBe(true);
    expect(shouldDismissToast(40, 0.8, 400)).toBe(true);
    expect(shouldDismissToast(40, -0.8, 400)).toBe(false);
    expect(shouldDismissToast(40, 0.1, 400)).toBe(false);
  });
});

describe('<Toaster />', () => {
  it('announces politely and undoes via the action button', async () => {
    const user = userEvent.setup();
    const undo = vi.fn();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Archivé', action: { label: 'Annuler', onClick: undo } });
    });
    const region = document.querySelector('[aria-live="polite"]');
    expect(region?.textContent).toContain('Archivé');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(undo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Archivé')).toBeNull();
  });

  it('undoes with Ctrl+Z outside text fields only', () => {
    const undo = vi.fn();
    render(
      <>
        <input aria-label="Champ" />
        <Toaster />
      </>,
    );
    act(() => {
      toast({ title: 'Supprimé', action: { label: 'Annuler', onClick: undo } });
    });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'z', ctrlKey: true });
    expect(undo).not.toHaveBeenCalled();
    act(() => {
      fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    });
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after its duration and pauses while hovered', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Enregistré', duration: 1000 });
    });
    const region = document.querySelector('section')!;
    fireEvent.pointerEnter(region);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('Enregistré')).not.toBeNull();
    fireEvent.pointerLeave(region);
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByText('Enregistré')).toBeNull();
  });
});
