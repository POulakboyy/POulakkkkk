/** What the mini-player and the full-screen player show, derived from the session (pure). */
import type { Task, Timestamp } from '@pouxis/core';
import type { PomodoroBlock } from '@pouxis/core/tasks';
import * as session from './session.ts';
import type { FocusSession } from './session.ts';

/**
 * - `focus`: a focus block is running;
 * - `break`: a break is running;
 * - `paused`: the user paused mid-block;
 * - `ready`: a break ended and the next focus block waits for the user.
 */
export type FocusPhase = 'focus' | 'break' | 'paused' | 'ready';

export interface FocusDisplay {
  phase: FocusPhase;
  title: string;
  icon: string;
  /** Share of the current block elapsed, 0..1. */
  progress: number;
  remainingSec: number;
  count: { current: number; total: number };
  next?: PomodoroBlock;
  running: boolean;
  isBreak: boolean;
}

export function phaseOf(s: FocusSession): FocusPhase {
  if (session.isRunning(s)) return session.isBreak(s) ? 'break' : 'focus';
  return s.elapsedMs === 0 && s.index > 0 ? 'ready' : 'paused';
}

export function focusDisplay(
  s: FocusSession,
  task: Task | undefined,
  now: Timestamp,
  fallbackTitle: string,
): FocusDisplay {
  const next = session.nextBlock(s);
  const display: FocusDisplay = {
    phase: phaseOf(s),
    title: task?.title ?? fallbackTitle,
    icon: task?.icon ?? (task?.mode === 'create' ? '✏️' : '🎯'),
    progress: session.blockProgress(s, now),
    remainingSec: Math.ceil(session.remainingMs(s, now) / 1000),
    count: session.focusCount(s),
    running: session.isRunning(s),
    isBreak: session.isBreak(s),
  };
  if (next) display.next = next;
  return display;
}
