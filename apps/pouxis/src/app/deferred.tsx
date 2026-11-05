/**
 * Shell chrome that is not needed for the first paint, split out of the initial chunk: the
 * command bar (natural-language parser, search index) and the quick-capture window.
 * `openCommandBar` itself lives in the tiny state module, so ⌘K works before the chunk loads.
 */
import { lazy, useEffect, useState, type ComponentType } from 'react';
import { useCommandBar } from '../features/command/state.ts';

type Module = { default: ComponentType };

export const loadCommandBar = (): Promise<Module> =>
  import('../features/command/CommandBar.tsx').then((m) => ({ default: m.CommandBar }));

export const loadQuickCapture = (): Promise<Module> =>
  import('../features/command/QuickCapture.tsx').then((m) => ({ default: m.QuickCapture }));

export const QuickCapture = lazy(loadQuickCapture);

/**
 * Loads the command bar right after the shell mounts and keeps it mounted (it renders nothing
 * while closed). Not `lazy()`: a lazy component suspends on its first render even when its
 * chunk is cached, and that extra commit would land on the user's first ⌘K. Opening before the
 * chunk arrives shows the bar as soon as it does; a failed load is retried on the next opening.
 */
export function DeferredCommandBar() {
  const { session } = useCommandBar();
  const [Bar, setBar] = useState<ComponentType | null>(null);
  useEffect(() => {
    if (Bar) return;
    let alive = true;
    loadCommandBar().then(
      (m) => alive && setBar(() => m.default),
      (error: unknown) => console.warn('[shell] command bar failed to load', error),
    );
    return () => {
      alive = false;
    };
  }, [Bar, session]);
  return Bar ? <Bar /> : null;
}
