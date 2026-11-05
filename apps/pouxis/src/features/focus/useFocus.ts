/**
 * The app's single focus controller and the React hook that reads it. Created lazily so tests
 * and the first render pay nothing until a session starts.
 */
import { useSyncExternalStore } from 'react';
import { platform } from '../../platform/index.ts';
import { store } from '../../store/index.ts';
import { toast } from '../../ui/index.ts';
import { createFocusController, type FocusController, type FocusState } from './controller.ts';
import { createNoisePlayer } from './noise.ts';

let instance: FocusController | null = null;

/** `platform` is swapped at startup (`setPlatform`): always call through the live binding. */
const livePlatform = {
  setFocusMode: (on: boolean) => platform.setFocusMode(on),
  haptic: (kind: Parameters<typeof platform.haptic>[0]) => platform.haptic(kind),
  notify: (title: string, body?: string) => platform.notify(title, body),
};

export function focusController(): FocusController {
  instance ??= createFocusController({
    store,
    platform: livePlatform,
    noise: createNoisePlayer(),
    toast,
  });
  return instance;
}

/** Replaces the controller (tests). Pass `null` to recreate the default one lazily. */
export function setFocusController(next: FocusController | null): void {
  instance = next;
}

export function useFocus(): FocusState {
  const controller = focusController();
  return useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
}
