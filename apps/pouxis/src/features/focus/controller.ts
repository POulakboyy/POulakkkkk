/**
 * App-wide focus controller: one Pomodoro session at a time, shared by the mini-player, the
 * full-screen Focus Unique mode and the Today timeline. It records focus stretches into the
 * task (`timeLogs`), drives OS "Do Not Disturb" (1.11) and the ambient noise.
 */
import { tasks as taskEngine } from '@pouxis/core';
import type { Id, TimeLog, Timestamp } from '@pouxis/core';
import { translate, formatDuration, type MessageKey, type MessageVars } from '../../i18n/index.ts';
import type { FocusModeResult, Platform } from '../../platform/index.ts';
import type { Store } from '../../store/index.ts';
import type { ToastOptions } from '../../ui/index.ts';
import { completeTask } from './complete.ts';
import type { NoiseKind, NoisePlayer } from './noise.ts';
import * as session from './session.ts';
import type { FocusSession, FocusSignal } from './session.ts';

export interface FocusState {
  session: FocusSession | null;
  /** Full-screen Focus Unique mode (2.14) is open. */
  expanded: boolean;
  sound: NoiseKind | null;
  /** The user wants OS "Do Not Disturb" during focus. */
  dndWanted: boolean;
  /** Outcome of the last `setFocusMode(true)`; null while DND is off. */
  dnd: FocusModeResult | null;
  /** Clock of the last update, so views re-render once per second while running. */
  now: Timestamp;
}

export interface FocusDeps {
  store: Store;
  platform: Pick<Platform, 'setFocusMode' | 'haptic' | 'notify'>;
  noise: NoisePlayer;
  toast: (options: ToastOptions) => void;
  clock?: () => Timestamp;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
}

export interface FocusController {
  getState(): FocusState;
  subscribe(listener: () => void): () => void;
  start(taskId: Id): void;
  pause(): void;
  resume(): void;
  stop(): void;
  skipBreak(): void;
  extend(minutes: number): void;
  /** Marks the focused task done and ends the session. */
  complete(): void;
  setExpanded(expanded: boolean): void;
  setSound(kind: NoiseKind | null): void;
  setDnd(wanted: boolean): void;
  /** Processes elapsed blocks now (the interval calls it every second). */
  tick(): void;
}

const BREAK_IDEAS = ['look', 'stretch', 'water', 'breathe', 'walk'] as const;

export function createFocusController(deps: FocusDeps): FocusController {
  const clock = deps.clock ?? Date.now;
  const setTimer = deps.setInterval ?? ((fn, ms) => globalThis.setInterval(fn, ms));
  const clearTimer =
    deps.clearInterval ?? ((h) => globalThis.clearInterval(h as ReturnType<typeof setInterval>));
  const listeners = new Set<() => void>();
  let state: FocusState = {
    session: null,
    expanded: false,
    sound: null,
    dndWanted: true,
    dnd: null,
    now: clock(),
  };
  let timer: unknown = null;
  let breaks = 0;

  const t = (key: MessageKey, vars?: MessageVars) =>
    translate(deps.store.prefs().locale, key, vars);

  function set(patch: Partial<FocusState>): void {
    state = { ...state, ...patch, now: clock() };
    syncTimer();
    for (const l of [...listeners]) l();
  }

  function syncTimer(): void {
    const running = state.session !== null && session.isRunning(state.session);
    if (running && timer === null) timer = setTimer(() => controller.tick(), 1000);
    if (!running && timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  function record(taskId: Id, logs: readonly TimeLog[]): void {
    for (const log of logs) {
      const task = deps.store.get('tasks', taskId);
      if (task) deps.store.update('tasks', taskId, taskEngine.logTimePatch(task, log));
    }
  }

  function setDndOs(on: boolean): void {
    if (on) {
      void deps.platform.setFocusMode(true).then(
        (dnd) => {
          if (state.session) set({ dnd });
          // The session ended while the OS was switching DND on: switch it back off.
          else if (dnd.applied) void deps.platform.setFocusMode(false).catch(() => {});
        },
        () => set({ dnd: { applied: false, method: 'none', reason: 'command-failed' } }),
      );
    } else if (state.dnd) {
      if (state.dnd.applied) void deps.platform.setFocusMode(false).catch(() => {});
      state = { ...state, dnd: null };
    }
  }

  function end(taskId: Id, logs: readonly TimeLog[]): void {
    record(taskId, logs);
    setDndOs(false);
    deps.noise.stop();
    set({ session: null, expanded: false, sound: null });
  }

  function announce(signals: readonly FocusSignal[], taskId: Id): void {
    const finished = signals.includes('session-done');
    for (const signal of signals) {
      if (signal === 'focus-done' && !finished) {
        const idea = BREAK_IDEAS[breaks++ % BREAK_IDEAS.length] ?? 'breathe';
        deps.platform.haptic('success');
        deps.toast({
          title: t('today.focus.onBreak'),
          description: t(`today.focus.breakIdeas.${idea}`),
        });
      } else if (signal === 'break-done') {
        deps.platform.haptic('light');
        deps.toast({ title: t('today.focus.breakDone') });
        void deps.platform.notify(t('today.focus.breakDone'));
      } else if (signal === 'session-done') {
        const task = deps.store.get('tasks', taskId);
        const minutes = task ? taskEngine.focusMinutes(task) : 0;
        const title = t('today.focus.sessionDone', {
          duration: formatDuration(minutes, deps.store.prefs().locale),
        });
        deps.platform.haptic('success');
        deps.toast({ title, tone: 'success' });
        void deps.platform.notify(title);
      }
    }
  }

  const controller: FocusController = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start(taskId) {
      const task = deps.store.get('tasks', taskId);
      if (!task) return;
      const now = clock();
      if (state.session) record(state.session.taskId, session.stop(state.session, now).logs);
      if (task.status === 'todo' || task.status === 'inbox') {
        deps.store.update('tasks', taskId, { status: 'doing' });
      }
      const wasActive = state.session !== null;
      set({ session: session.startSession(task, now) });
      deps.platform.haptic('medium');
      if (!wasActive && state.dndWanted) setDndOs(true);
    },
    pause() {
      const s = state.session;
      if (!s) return;
      const step = session.pause(s, clock());
      record(s.taskId, step.logs);
      set({ session: step.session });
    },
    resume() {
      if (state.session) set({ session: session.resume(state.session, clock()) });
    },
    stop() {
      const s = state.session;
      if (s) end(s.taskId, session.stop(s, clock()).logs);
    },
    skipBreak() {
      if (state.session) set({ session: session.skipBreak(state.session, clock()) });
    },
    extend(minutes) {
      if (state.session) set({ session: session.extend(state.session, minutes) });
    },
    complete() {
      const s = state.session;
      if (!s) return;
      const now = clock();
      end(s.taskId, session.stop(s, now).logs);
      completeTask(deps.store, s.taskId, now);
    },
    setExpanded(expanded) {
      if (state.expanded !== expanded) set({ expanded });
    },
    setSound(kind) {
      if (kind === null) deps.noise.stop();
      else void deps.noise.play(kind).catch(() => set({ sound: null }));
      set({ sound: kind });
    },
    setDnd(wanted) {
      if (state.session) setDndOs(wanted);
      set({ dndWanted: wanted });
    },
    tick() {
      const s = state.session;
      if (!s) return;
      const step = session.advance(s, clock());
      record(s.taskId, step.logs);
      if (step.session === null) {
        announce(step.signals, s.taskId);
        end(s.taskId, []);
        return;
      }
      set({ session: step.session });
      announce(step.signals, s.taskId);
    },
  };
  return controller;
}
