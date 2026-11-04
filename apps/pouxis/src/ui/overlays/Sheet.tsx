import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { platform } from '../../platform/index.ts';
import { IconButton } from '../actions/IconButton.tsx';
import { resolveSheetRelease, rubberbandClamp, VelocityTracker } from '../gestures/physics.ts';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery.ts';
import { usePresence } from '../hooks/usePresence.ts';
import { IconClose } from '../icons.tsx';
import { useUiLabels } from '../labels.ts';
import { useT } from '../../i18n/index.ts';
import { cx } from '../utils/cx.ts';
import { Portal } from '../utils/Portal.tsx';
import { mergeRefs } from '../utils/refs.ts';
import { useModal } from './useModal.ts';
import s from './Overlay.module.css';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sheet title (`aria-labelledby`). */
  title: ReactNode;
  /** Hide the title visually (it still names the sheet). */
  hideTitle?: boolean;
  description?: ReactNode;
  children?: ReactNode;
  /** Sticky action row at the bottom. */
  footer?: ReactNode;
  /**
   * Bottom-sheet heights as fractions of the viewport, e.g. `[0.5, 0.92]`. The sheet opens at
   * `defaultSnap`; dragging the grabber (or activating it) moves between them. Default `[0.92]`.
   */
  snapPoints?: readonly number[];
  /** Index into `snapPoints` to open at. Default: the largest. */
  defaultSnap?: number;
  /** `auto`: bottom sheet below 768 px, side panel above · `bottom` · `side`. Default `auto`. */
  presentation?: 'auto' | 'bottom' | 'side';
  /** Allow dismissal by drag, Escape and backdrop. Default `true`. */
  dismissible?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
}

/** Resting translateY (as a % of the panel height) for snap `fraction` when the panel is `max` tall. */
export function snapPercent(fraction: number, max: number): number {
  return max > 0 ? (1 - fraction / max) * 100 : 0;
}

/**
 * Bottom sheet on phones (drag-to-dismiss with velocity, rubber-banding and snap points) and a
 * side panel from 768 px. Modal: focus trap + restore, inert page, Escape, scroll lock.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  description,
  children,
  footer,
  snapPoints = [0.92],
  defaultSnap,
  presentation = 'auto',
  dismissible = true,
  initialFocus,
  className,
}: SheetProps) {
  const labels = useUiLabels();
  const t = useT();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const side = presentation === 'side' || (presentation === 'auto' && isDesktop);
  const snaps = [...snapPoints].sort((a, b) => a - b);
  const max = snaps[snaps.length - 1] ?? 0.92;
  const [snap, setSnap] = useState(() => clampIndex(defaultSnap ?? snaps.length - 1, snaps.length));
  const [drag, setDrag] = useState<number | null>(null);
  const titleId = useId();
  const descId = useId();
  const layerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const presence = usePresence<HTMLDivElement>(open);
  const gesture = useRef<{ startY: number; startOffset: number; height: number } | null>(null);
  const tracker = useRef(new VelocityTracker());
  const dragged = useRef(false);
  const close = () => onOpenChange(false);

  useModal({
    open,
    layerRef,
    panelRef,
    onDismiss: close,
    closeOnEscape: dismissible,
    initialFocus,
  });

  // Reset to the default snap each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSnap(clampIndex(defaultSnap ?? snaps.length - 1, snaps.length));
  }

  if (!presence.mounted) return null;

  const restingPercent = snapPercent(snaps[snap] ?? max, max);
  const offsetPx = (h: number) => (restingPercent / 100) * h;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (side || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if ((e.target as Element).closest('button:not([data-grabber]), a, input, textarea, select'))
      return;
    const height = panelRef.current?.offsetHeight ?? 0;
    gesture.current = { startY: e.clientY, startOffset: offsetPx(height), height };
    dragged.current = false;
    tracker.current.reset();
    tracker.current.add(e.clientY, e.timeStamp);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    tracker.current.add(e.clientY, e.timeStamp);
    const dy = e.clientY - g.startY;
    // A few pixels of slop keep taps on the grabber as taps.
    if (drag === null && Math.abs(dy) < 4) return;
    dragged.current = true;
    const lowest = dismissible ? g.height : (snapPercent(snaps[0] ?? max, max) / 100) * g.height;
    setDrag(rubberbandClamp(g.startOffset + dy, 0, lowest, g.height));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || drag === null) {
      setDrag(null);
      return;
    }
    const snapOffsets = snaps.map((f) => (snapPercent(f, max) / 100) * g.height).reverse();
    const result = resolveSheetRelease({
      offset: drag,
      velocity: tracker.current.velocity(e.timeStamp),
      snapOffsets,
      closedOffset: g.height,
      dismissible,
    });
    setDrag(null);
    if (result === 'dismiss') {
      close();
      return;
    }
    const index = snapOffsets.indexOf(result);
    const next = snaps.length - 1 - index;
    if (next !== snap) platform.haptic('selection');
    setSnap(clampIndex(next, snaps.length));
  };

  const cycleSnap = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    setSnap((i) => (i + 1) % snaps.length);
  };
  const canResize = !side && snaps.length > 1;

  const panelStyle: CSSProperties = side
    ? {}
    : {
        ['--sheet-h' as string]: `${max * 100}dvh`,
        transform:
          presence.state === 'closed'
            ? 'translateY(100%)'
            : drag !== null
              ? `translateY(${drag}px)`
              : `translateY(${restingPercent}%)`,
      };

  return (
    <Portal>
      <div ref={layerRef} className={s.layer} data-state={presence.state}>
        <div className={s.backdrop} aria-hidden="true" onClick={dismissible ? close : undefined} />
        <div
          ref={mergeRefs(panelRef, presence.ref)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          data-state={presence.state}
          data-dragging={drag !== null || undefined}
          className={cx(side ? s.side : s.sheet, className)}
          style={panelStyle}
        >
          <div
            className={s.sheetHeader}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {!side &&
              (canResize ? (
                <button
                  type="button"
                  data-grabber=""
                  className={s.grabber}
                  aria-label={
                    snap === snaps.length - 1
                      ? t('common.actions.collapse')
                      : t('common.actions.expand')
                  }
                  onClick={cycleSnap}
                >
                  <span className={s.grabberBar} />
                </button>
              ) : (
                <span className={s.grabber} aria-hidden="true">
                  <span className={s.grabberBar} />
                </span>
              ))}
            <div className={s.header}>
              <h2 id={titleId} className={cx(s.title, hideTitle && s.srOnly)}>
                {title}
              </h2>
              {dismissible && (
                <IconButton
                  className={s.close}
                  label={labels.close}
                  icon={<IconClose />}
                  size="sm"
                  variant="secondary"
                  onClick={close}
                />
              )}
            </div>
            {description && (
              <p id={descId} className={s.description}>
                {description}
              </p>
            )}
          </div>
          <div className={s.sheetBody}>{children}</div>
          {footer && <div className={cx(s.footer, s.sheetFooter)}>{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

function clampIndex(i: number, count: number): number {
  return Math.min(Math.max(0, Math.round(i)), Math.max(0, count - 1));
}
