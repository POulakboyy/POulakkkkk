import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { FOCUS_START_EVENT } from '../../app/actions.ts';
import { withViewTransition } from '../../design/view-transition.ts';
import { store } from '../../store/index.ts';
import { FocusMode } from './FocusMode.tsx';
import { MiniPlayer } from './MiniPlayer.tsx';
import { pickFocusTask } from './pick.ts';
import { focusController, useFocus } from './useFocus.ts';

export { focusController, setFocusController, useFocus } from './useFocus.ts';
export { completeTask, reopenTask } from './complete.ts';
export type { FocusController, FocusState } from './controller.ts';

/** Opens or closes Focus Unique with the shared-element morph (mini-player ⇄ full screen). */
export function setFocusExpanded(expanded: boolean): void {
  void withViewTransition(() => {
    flushSync(() => focusController().setExpanded(expanded));
  });
}

/** Starts a focus session on `taskId` (or resumes the view of the running one). */
export function startFocus(taskId: string): void {
  focusController().start(taskId);
}

/**
 * Root of the focus feature, mounted once by the shell: the docked mini-player while a session
 * runs, Focus Unique when expanded. Also answers the app-wide "start focus" action.
 */
export function FocusMiniPlayer() {
  const controller = focusController();
  const state = useFocus();

  useEffect(() => {
    const onStart = () => {
      const c = focusController();
      if (c.getState().session) {
        setFocusExpanded(true);
        return;
      }
      const { timeZone } = store.prefs();
      const task = pickFocusTask(store.all('tasks'), Date.now(), timeZone);
      if (task) c.start(task.id);
    };
    window.addEventListener(FOCUS_START_EVENT, onStart);
    return () => window.removeEventListener(FOCUS_START_EVENT, onStart);
  }, []);

  const session = state.session;
  if (!session) return null;
  const active = { ...state, session };
  return state.expanded ? (
    <FocusMode state={active} controller={controller} onCollapse={() => setFocusExpanded(false)} />
  ) : (
    <MiniPlayer state={active} controller={controller} onExpand={() => setFocusExpanded(true)} />
  );
}
