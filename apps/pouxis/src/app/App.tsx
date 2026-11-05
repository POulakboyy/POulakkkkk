import { lazy, memo, Suspense, useSyncExternalStore } from 'react';
import { store } from '../store/index.ts';
import { setAppPrefs, useAppPrefs } from './appPrefs.ts';
import { QuickCapture } from './deferred.tsx';
import { useRoute } from './router.ts';
import { Shell } from './Shell.tsx';
import { doingMode, modeForView, useAppearance } from './theme.ts';

const Onboarding = lazy(() => import('../features/onboarding/index.tsx'));

/** Memoised: the root re-renders on appearance changes, which must not cascade into the views. */
const MemoShell = memo(Shell);

const doingSnapshot = () => doingMode(store.all('tasks'));

/** Mode of the running task; re-renders only when that mode changes, not on every task edit. */
function useDoingMode() {
  return useSyncExternalStore(store.subscribe, doingSnapshot, doingSnapshot);
}

/**
 * Root: applies appearance to <html> (theme, daylight, zen, work mode), then shows the
 * quick-capture window, the first-run introduction or the app shell.
 */
export function App() {
  const { view } = useRoute();
  const prefs = useAppPrefs();
  const doing = useDoingMode();
  useAppearance(prefs, modeForView(view, doing));

  if (view === 'capture') {
    return (
      <Suspense fallback={null}>
        <QuickCapture />
      </Suspense>
    );
  }
  if (!prefs.onboarded) {
    return (
      <Suspense fallback={null}>
        <Onboarding onDone={() => setAppPrefs({ onboarded: true })} />
      </Suspense>
    );
  }
  return <MemoShell />;
}
