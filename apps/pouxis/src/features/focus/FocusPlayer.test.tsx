import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { store as appStore } from '../../store/index.ts';
import { createFocusController } from './controller.ts';
import { FocusMiniPlayer, setFocusController } from './index.tsx';
import type { NoisePlayer } from './noise.ts';
import { taskFixture, type FakeStore } from './testing.ts';

vi.mock('../../store/index.ts', async () => (await import('./testing.ts')).fakeStoreModule());

const store = appStore as FakeStore;
const T0 = Date.UTC(2026, 10, 5, 9, 0);

function setup() {
  let now = T0;
  const noise: NoisePlayer = { play: vi.fn(async () => {}), stop: vi.fn(), kind: null };
  const controller = createFocusController({
    store,
    platform: {
      setFocusMode: vi.fn(async () => ({
        applied: false,
        method: 'none' as const,
        reason: 'web' as const,
      })),
      haptic: vi.fn(),
      notify: vi.fn(async () => {}),
    },
    noise,
    toast: vi.fn(),
    clock: () => now,
    setInterval: () => 0,
    clearInterval: () => {},
  });
  setFocusController(controller);
  const task = store.create(
    'tasks',
    taskFixture({ title: 'Écrire le chapitre', estimateMin: 25, icon: '📖' }),
  );
  const tick = (ms: number) =>
    act(() => {
      now += ms;
      controller.tick();
    });
  return { controller, task, tick, noise };
}

beforeEach(() => store.reset());
afterEach(() => {
  cleanup();
  setFocusController(null);
});

describe('FocusMiniPlayer', () => {
  it('renders nothing without a session', () => {
    setup();
    const { container } = render(<FocusMiniPlayer />);
    expect(container.innerHTML).toBe('');
  });

  it('docks a mini-player with the task, the time left and play/pause', () => {
    const { controller, task, tick } = setup();
    render(<FocusMiniPlayer />);
    act(() => controller.start(task.id));
    const player = screen.getByRole('region', { name: 'Lecteur de focus' });
    expect(player.textContent).toContain('Écrire le chapitre');
    expect(player.textContent).toContain('25:00');
    tick(60_000);
    expect(player.textContent).toContain('24:00');
    fireEvent.click(screen.getByRole('button', { name: 'Mettre en pause' }));
    expect(controller.getState().session?.runningSince).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Reprendre' })).toBeTruthy();
  });

  it('expands into Focus Unique and collapses with Escape', async () => {
    const { controller, task } = setup();
    render(<FocusMiniPlayer />);
    act(() => controller.start(task.id));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Agrandir le lecteur/ }));
    });
    const dialog = screen.getByRole('dialog', { name: 'Écrire le chapitre' });
    expect(dialog).toBeTruthy();
    expect(screen.getByRole('switch', { name: /Ne pas déranger/ })).toBeTruthy();
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(controller.getState().expanded).toBe(false);
  });

  it('switches the ambient sound and completes the task from full screen', async () => {
    const { controller, task, noise } = setup();
    render(<FocusMiniPlayer />);
    act(() => {
      controller.start(task.id);
      controller.setExpanded(true);
    });
    act(() => controller.setSound('brown'));
    expect(noise.play).toHaveBeenCalledWith('brown');
    fireEvent.click(screen.getByRole('button', { name: 'Marquer comme terminée' }));
    expect(store.get('tasks', task.id)?.status).toBe('done');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
