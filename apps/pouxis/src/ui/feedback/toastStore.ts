/**
 * Toast queue — framework-free so any code (store actions, shortcuts) can call `toast()`.
 * Rendered by <Toaster />. Spark-style: act immediately, offer Undo, no confirmation dialog.
 */

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface ToastAction {
  /** Verb, e.g. `t('common.undo')`. */
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  title: string;
  description?: string;
  /** One action (typically Undo). Activating it dismisses the toast. */
  action?: ToastAction;
  tone?: ToastTone;
  /** Visible time in ms (paused while hovered/focused or the app is hidden). Default 5 s, 8 s with an action; `Infinity` keeps it. */
  duration?: number;
  /** Reuse an id to replace an existing toast instead of stacking a new one. */
  id?: string;
}

export interface ToastRecord extends Required<Pick<ToastOptions, 'title' | 'tone' | 'duration'>> {
  id: string;
  description?: string | undefined;
  action?: ToastAction | undefined;
  createdAt: number;
}

type Listener = () => void;

let toasts: readonly ToastRecord[] = [];
const listeners = new Set<Listener>();
let counter = 0;

/** Maximum toasts kept in the queue; older ones drop off. */
export const MAX_TOASTS = 5;

function emit() {
  for (const l of listeners) l();
}

/** Default visibility: long enough to read and reach Undo (WCAG 2.2.1 — also paused on hover/focus). */
export function defaultDuration(options: Pick<ToastOptions, 'action' | 'duration'>): number {
  return options.duration ?? (options.action ? 8000 : 5000);
}

/** Shows a toast and returns its id. */
export function toast(options: ToastOptions): string {
  const id = options.id ?? `toast-${++counter}`;
  const record: ToastRecord = {
    id,
    title: options.title,
    description: options.description,
    action: options.action,
    tone: options.tone ?? 'neutral',
    duration: defaultDuration(options),
    createdAt: Date.now(),
  };
  const rest = toasts.filter((t) => t.id !== id);
  toasts = [...rest, record].slice(-MAX_TOASTS);
  emit();
  return id;
}

/** Removes one toast, or all of them without an id. */
export function dismissToast(id?: string): void {
  const next = id === undefined ? [] : toasts.filter((t) => t.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

/** Runs a toast's action (e.g. Undo) and dismisses it. Returns whether an action ran. */
export function runToastAction(id: string): boolean {
  const record = toasts.find((t) => t.id === id);
  if (!record?.action) return false;
  dismissToast(id);
  record.action.onClick();
  return true;
}

/** The newest toast that offers an action (target of the ⌘Z / Ctrl+Z shortcut). */
export function latestActionToast(): ToastRecord | undefined {
  for (let i = toasts.length - 1; i >= 0; i--) if (toasts[i]!.action) return toasts[i];
  return undefined;
}

export function getToasts(): readonly ToastRecord[] {
  return toasts;
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
