import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { platform } from '../../platform/index.ts';
import { IconButton } from '../actions/IconButton.tsx';
import { VelocityTracker } from '../gestures/physics.ts';
import { IconAlert, IconCheck, IconClose, IconInfo } from '../icons.tsx';
import { useUiLabels } from '../labels.ts';
import { cx } from '../utils/cx.ts';
import { isEditableTarget, isApplePlatform } from '../utils/dom.ts';
import { Portal } from '../utils/Portal.tsx';
import {
  dismissToast,
  getToasts,
  latestActionToast,
  runToastAction,
  subscribeToasts,
  type ToastRecord,
} from './toastStore.ts';
import s from './Toast.module.css';

export interface ToasterProps {
  /** ⌘Z / Ctrl+Z runs the newest toast's action (outside text fields). Default `true`. */
  undoShortcut?: boolean;
  /** How many toasts are visible at once; older ones tuck behind. Default 3. */
  visible?: number;
}

/** Fraction of the toast width a swipe must travel to dismiss (or a fast flick). */
export const TOAST_SWIPE_DISMISS = 0.35;
export const TOAST_FLICK_VELOCITY = 0.5;

/** Whether releasing a horizontal toast swipe at `offset` px with `velocity` px/ms dismisses it. */
export function shouldDismissToast(offset: number, velocity: number, width: number): boolean {
  if (width <= 0) return false;
  if (Math.abs(offset) >= width * TOAST_SWIPE_DISMISS) return true;
  return Math.abs(velocity) >= TOAST_FLICK_VELOCITY && Math.sign(velocity) === Math.sign(offset);
}

/**
 * Renders the toast queue: stacked, newest in front, expanding on hover/focus, swipe to
 * dismiss, polite live region. Mount once near the app root. Stays usable over modals.
 */
export function Toaster({ undoShortcut = true, visible = 3 }: ToasterProps) {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  const [expanded, setExpanded] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!undoShortcut) return;
    const apple = isApplePlatform();
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = apple ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
      if (!mod || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'z') return;
      if (e.defaultPrevented || isEditableTarget(e.target)) return;
      const target = latestActionToast();
      if (!target) return;
      e.preventDefault();
      runToastAction(target.id);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undoShortcut]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const shown = toasts.slice(-visible);
  return (
    <Portal>
      <section
        className={s.viewport}
        data-px-inert-exempt=""
        aria-live="polite"
        aria-relevant="additions text"
        data-expanded={expanded || undefined}
        onPointerEnter={() => setExpanded(true)}
        onPointerLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setExpanded(false);
        }}
      >
        <ol className={s.list} role="list">
          {shown.map((t, i) => (
            <ToastItem
              key={t.id}
              toast={t}
              depth={shown.length - 1 - i}
              paused={paused || expanded}
            />
          ))}
        </ol>
      </section>
    </Portal>
  );
}

const TONE_ICON = {
  neutral: null,
  success: IconCheck,
  warning: IconInfo,
  danger: IconAlert,
} as const;

function ToastItem({
  toast,
  depth,
  paused,
}: {
  toast: ToastRecord;
  depth: number;
  paused: boolean;
}) {
  const labels = useUiLabels();
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; width: number } | null>(null);
  const tracker = useRef(new VelocityTracker());
  const remaining = useRef(toast.duration);

  useEffect(() => {
    remaining.current = toast.duration;
  }, [toast.createdAt, toast.duration]);

  useEffect(() => {
    if (paused || !Number.isFinite(remaining.current) || leaving) return;
    const started = Date.now();
    const timer = window.setTimeout(() => dismissToast(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [paused, toast.id, toast.createdAt, leaving]);

  const onPointerDown = (e: ReactPointerEvent<HTMLLIElement>) => {
    if ((e.target as Element).closest('button')) return;
    drag.current = { x: e.clientX, width: e.currentTarget.offsetWidth };
    tracker.current.reset();
    tracker.current.add(e.clientX, e.timeStamp);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLLIElement>) => {
    if (!drag.current) return;
    tracker.current.add(e.clientX, e.timeStamp);
    setDx(e.clientX - drag.current.x);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLLIElement>) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (shouldDismissToast(dx, tracker.current.velocity(e.timeStamp), d.width)) {
      platform.haptic('light');
      setLeaving(dx >= 0 ? 1 : -1);
      window.setTimeout(() => dismissToast(toast.id), 160);
    } else {
      setDx(0);
    }
  };

  const Icon = TONE_ICON[toast.tone];

  return (
    <li
      className={cx(s.toast, s[toast.tone])}
      data-depth={Math.min(depth, 3)}
      data-dragging={dragging || undefined}
      style={{
        ['--depth' as string]: depth,
        ['--dx' as string]: leaving ? `${leaving * 120}%` : `${dx}px`,
        opacity: leaving ? 0 : 1 - Math.min(0.6, Math.abs(dx) / 400),
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {Icon && (
        <span className={s.icon} aria-hidden="true">
          <Icon size={20} />
        </span>
      )}
      <div className={s.text}>
        <p className={s.title}>{toast.title}</p>
        {toast.description && <p className={s.description}>{toast.description}</p>}
      </div>
      {toast.action && (
        <button type="button" className={s.action} onClick={() => runToastAction(toast.id)}>
          {toast.action.label}
        </button>
      )}
      <IconButton
        className={s.dismiss}
        label={labels.dismiss}
        icon={<IconClose size={18} />}
        size="sm"
        onClick={() => dismissToast(toast.id)}
      />
    </li>
  );
}
