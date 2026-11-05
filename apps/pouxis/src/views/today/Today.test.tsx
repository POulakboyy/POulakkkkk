import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { atMinutes, startOfDay } from '@pouxis/core';
import { eventFixture, taskFixture, type FakeStore } from '../../features/focus/testing.ts';
import { focusController, setFocusController } from '../../features/focus/index.tsx';
import { store as appStore } from '../../store/index.ts';
import TodayView from './index.tsx';

vi.mock('../../store/index.ts', async () =>
  (await import('../../features/focus/testing.ts')).fakeStoreModule(),
);
vi.mock('../../features/command/index.tsx', () => ({ openCommandBar: vi.fn() }));

const store = appStore as FakeStore;
const TZ = 'Europe/Paris';
// Thursday 5 November 2026, 11:20 in Paris.
const NOW = Date.UTC(2026, 10, 5, 10, 20);
const DAY0 = startOfDay(NOW, TZ);
const at = (h: number, m = 0) => atMinutes(DAY0, h * 60 + m, TZ);

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  store.reset();
  setFocusController(null);
});

afterEach(() => {
  focusController().stop();
  cleanup();
  vi.useRealTimers();
});

const renderToday = () => render(<TodayView />);

describe('TodayView', () => {
  it('shows the day: greeting, timeline blocks, now line and floating tray', () => {
    store.create(
      'events',
      eventFixture({ title: 'Revue', start: at(14), end: at(15), fixed: true }),
    );
    store.create(
      'tasks',
      taskFixture({ title: 'Esquisse', scheduled: { start: at(11), end: at(12) } }),
    );
    store.create('tasks', taskFixture({ title: 'Courriels', floatingDay: DAY0, estimateMin: 30 }));
    renderToday();

    expect(screen.getByRole('heading', { level: 1, name: 'Bonjour' })).toBeTruthy();
    const timeline = screen.getByRole('list', { name: 'Frise de la journée' });
    expect(within(timeline).getByText('Revue')).toBeTruthy();
    expect(within(timeline).getByText('Esquisse')).toBeTruthy();
    expect(screen.getByRole('img', { name: /Il est 11/ })).toBeTruthy();
    const tray = screen.getByRole('region', { name: 'Tâches flottantes' });
    expect(within(tray).getByText('Courriels')).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('completes a task from its checkbox', () => {
    const task = store.create(
      'tasks',
      taskFixture({ title: 'Esquisse', scheduled: { start: at(11), end: at(12) } }),
    );
    renderToday();
    fireEvent.click(screen.getByRole('checkbox', { name: /Esquisse/ }));
    expect(store.get('tasks', task.id)?.status).toBe('done');
    fireEvent.click(screen.getByRole('checkbox', { name: /Esquisse/ }));
    expect(store.get('tasks', task.id)?.status).toBe('todo');
  });

  it('plans the day: floating tasks get a slot', async () => {
    const task = store.create(
      'tasks',
      taskFixture({ title: 'Courriels', floatingDay: DAY0, estimateMin: 30 }),
    );
    renderToday();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Planifier ma journée' }));
      await new Promise((r) => setTimeout(r, 10));
    });
    const slot = store.get('tasks', task.id)?.scheduled;
    expect(slot).toBeDefined();
    expect(slot!.start).toBeGreaterThanOrEqual(NOW);
    expect(
      within(screen.getByRole('list', { name: 'Frise de la journée' })).getByText('Courriels'),
    ).toBeTruthy();
  });

  it('places a floating task in a free gap when the gap is activated', async () => {
    const task = store.create('tasks', taskFixture({ title: 'Courriels', floatingDay: DAY0 }));
    renderToday();
    const gaps = screen.getAllByRole('button', { name: /^Libre/ });
    await act(async () => {
      fireEvent.click(gaps[0]!);
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(store.get('tasks', task.id)?.scheduled).toBeDefined();
  });

  it('offers to shift the rest of the day when a task runs over', () => {
    const late = store.create(
      'tasks',
      taskFixture({ title: 'Esquisse', scheduled: { start: at(10), end: at(11) } }),
    );
    const next = store.create(
      'tasks',
      taskFixture({ title: 'Voix-off', scheduled: { start: at(11, 30), end: at(12, 30) } }),
    );
    renderToday();
    expect(screen.getByRole('heading', { name: /Esquisse.*déborde/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Décaler la suite' }));
    expect(store.get('tasks', late.id)?.scheduled?.end).toBeGreaterThan(at(11));
    expect(store.get('tasks', next.id)?.scheduled?.start).toBeGreaterThanOrEqual(at(11, 30));

    // The slot now ends later: nothing runs over any more.
    expect(screen.queryByRole('heading', { name: /déborde/ })).toBeNull();
  });

  it('lets the user dismiss an overrun', () => {
    store.create(
      'tasks',
      taskFixture({ title: 'Esquisse', scheduled: { start: at(10), end: at(11) } }),
    );
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: 'Laisser tel quel' }));
    expect(screen.queryByRole('heading', { name: /déborde/ })).toBeNull();
  });

  it('suggests breathers between back-to-back meetings and stores them', () => {
    store.create('events', eventFixture({ title: 'A', start: at(14), end: at(15) }));
    store.create('events', eventFixture({ title: 'B', start: at(15), end: at(16) }));
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter les transitions' }));
    expect(store.all('events').filter((e) => e.kind === 'buffer').length).toBeGreaterThan(0);
  });

  it('warns when a meeting splits the deep-work block', () => {
    store.create('events', eventFixture({ title: 'Sync', start: at(12, 45), end: at(14, 15) }));
    renderToday();
    expect(
      screen.getByRole('heading', { name: 'Cette réunion coupe une plage de création' }),
    ).toBeTruthy();
  });

  it('starts a focus session from a block', () => {
    const task = store.create(
      'tasks',
      taskFixture({ title: 'Esquisse', scheduled: { start: at(11), end: at(12) } }),
    );
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: /Se concentrer sur.*Esquisse/ }));
    const state = focusController().getState();
    expect(state.session?.taskId).toBe(task.id);
    expect(store.get('tasks', task.id)?.status).toBe('doing');
  });

  it('shows the WIP indicator and an empty state', () => {
    renderToday();
    expect(screen.getByText('0/5 priorités')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Une journée ouverte' })).toBeTruthy();
  });
});
