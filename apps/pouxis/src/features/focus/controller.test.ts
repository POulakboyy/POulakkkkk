import { describe, expect, it, vi } from 'vitest';
import { MINUTE } from '@pouxis/core';
import type { FocusModeResult } from '../../platform/index.ts';
import { createFocusController } from './controller.ts';
import type { NoisePlayer } from './noise.ts';
import { createFakeStore, taskFixture } from './testing.ts';

vi.mock('../../app/router.ts', () => ({ navigate: vi.fn() }));
vi.mock('../../ui/index.ts', () => ({ toast: vi.fn() }));

const T0 = Date.UTC(2026, 10, 5, 9, 0);

function setup(dnd: FocusModeResult = { applied: true, method: 'macos-shortcuts', reason: null }) {
  let now = T0;
  const store = createFakeStore({}, () => now);
  const task = store.create('tasks', taskFixture({ title: 'Draft', estimateMin: 50 }));
  const platform = {
    setFocusMode: vi.fn(async () => dnd),
    haptic: vi.fn(),
    notify: vi.fn(async () => {}),
  };
  const noise: NoisePlayer = { play: vi.fn(async () => {}), stop: vi.fn(), kind: null };
  const toast = vi.fn();
  const timers: (() => void)[] = [];
  const controller = createFocusController({
    store,
    platform,
    noise,
    toast,
    clock: () => now,
    setInterval: (fn) => timers.push(fn),
    clearInterval: () => {},
  });
  const advance = (ms: number) => {
    now += ms;
    controller.tick();
  };
  return { store, task, platform, noise, toast, controller, advance, timers };
}

describe('focus controller', () => {
  it('switches DND back off when the session ends before DND was applied', async () => {
    const { controller, task, platform } = setup();
    controller.start(task.id);
    controller.stop();
    await Promise.resolve();
    await Promise.resolve();
    expect(platform.setFocusMode).toHaveBeenLastCalledWith(false);
    expect(controller.getState().dnd).toBeNull();
  });

  it('starts a session, marks the task in progress and turns DND on', async () => {
    const { controller, store, task, platform, timers } = setup();
    controller.start(task.id);
    expect(controller.getState().session?.taskId).toBe(task.id);
    expect(store.get('tasks', task.id)?.status).toBe('doing');
    expect(platform.setFocusMode).toHaveBeenCalledWith(true);
    expect(platform.haptic).toHaveBeenCalledWith('medium');
    expect(timers).toHaveLength(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.getState().dnd?.applied).toBe(true);
  });

  it('logs focus time into the task when a block ends and announces the break', () => {
    const { controller, store, task, toast, advance } = setup();
    controller.start(task.id);
    advance(25 * MINUTE);
    expect(store.get('tasks', task.id)?.timeLogs).toEqual([
      { start: T0, end: T0 + 25 * MINUTE, kind: 'focus' },
    ]);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Pause' }));
  });

  it('ends the session, turns DND off and stops the noise on stop', async () => {
    const { controller, store, task, platform, noise, advance } = setup();
    controller.start(task.id);
    await Promise.resolve();
    await Promise.resolve();
    controller.setSound('pink');
    expect(noise.play).toHaveBeenCalledWith('pink');
    advance(10 * MINUTE);
    controller.stop();
    expect(controller.getState().session).toBeNull();
    expect(controller.getState().sound).toBeNull();
    expect(platform.setFocusMode).toHaveBeenLastCalledWith(false);
    expect(noise.stop).toHaveBeenCalled();
    expect(store.get('tasks', task.id)?.timeLogs).toHaveLength(1);
  });

  it('does not try to turn DND off when it could not be applied', async () => {
    const { controller, task, platform } = setup({ applied: false, method: 'none', reason: 'web' });
    controller.start(task.id);
    await Promise.resolve();
    await Promise.resolve();
    controller.stop();
    expect(platform.setFocusMode).toHaveBeenCalledTimes(1);
  });

  it('completes the task and records the running stretch', () => {
    const { controller, store, task, advance } = setup();
    controller.start(task.id);
    advance(5 * MINUTE);
    controller.complete();
    const saved = store.get('tasks', task.id);
    expect(saved?.status).toBe('done');
    expect(saved?.timeLogs).toHaveLength(1);
    expect(controller.getState().session).toBeNull();
  });

  it('pauses and resumes', () => {
    const { controller, task, advance } = setup();
    controller.start(task.id);
    advance(MINUTE);
    controller.pause();
    expect(controller.getState().session?.runningSince).toBeUndefined();
    controller.resume();
    expect(controller.getState().session?.runningSince).toBe(T0 + MINUTE);
  });

  it('notifies subscribers and ignores unknown tasks', () => {
    const { controller } = setup();
    const listener = vi.fn();
    const off = controller.subscribe(listener);
    controller.start('missing');
    expect(controller.getState().session).toBeNull();
    controller.setExpanded(true);
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    controller.setExpanded(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
