import { lazy, Suspense, useMemo } from 'react';
import { QuickCapture } from '../features/command/index.tsx';
import { useCollection } from '../store/index.ts';
import { setAppPrefs, useAppPrefs } from './appPrefs.ts';
import { useRoute } from './router.ts';
import { Shell } from './Shell.tsx';
import { modeForView, useAppearance } from './theme.ts';

const Onboarding = lazy(() => import('../features/onboarding/index.tsx'));

/**
 * Root: applies appearance to <html> (theme, daylight, zen, work mode), then shows the
 * quick-capture window, the first-run introduction or the app shell.
 */
export function App() {
  const { view } = useRoute();
  const prefs = useAppPrefs();
  const tasks = useCollection('tasks');
  const doing = useMemo(() => tasks.find((task) => task.status === 'doing')?.mode, [tasks]);
  useAppearance(prefs, modeForView(view, doing));

  if (view === 'capture') return <QuickCapture />;
  if (!prefs.onboarded) {
    return (
      <Suspense fallback={null}>
        <Onboarding onDone={() => setAppPrefs({ onboarded: true })} />
      </Suspense>
    );
  }
  return <Shell />;
}
