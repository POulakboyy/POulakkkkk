/**
 * Shell chrome that is not needed for the first paint, split out of the initial chunk: the
 * command bar (natural-language parser, search index) and the quick-capture window.
 * `openCommandBar` itself lives in the tiny state module, so ⌘K works before the chunk loads.
 */
import { lazy, Suspense, type ComponentType } from 'react';
import { useCommandBar } from '../features/command/state.ts';

type Module = { default: ComponentType };

export const loadCommandBar = (): Promise<Module> =>
  import('../features/command/CommandBar.tsx').then((m) => ({ default: m.CommandBar }));

export const loadQuickCapture = (): Promise<Module> =>
  import('../features/command/QuickCapture.tsx').then((m) => ({ default: m.QuickCapture }));

const CommandBar = lazy(loadCommandBar);
export const QuickCapture = lazy(loadQuickCapture);

/** Mounts the command bar on its first opening; it then stays mounted for its exit motion. */
export function DeferredCommandBar() {
  const { session } = useCommandBar();
  if (session === 0) return null;
  return (
    <Suspense fallback={null}>
      <CommandBar />
    </Suspense>
  );
}
