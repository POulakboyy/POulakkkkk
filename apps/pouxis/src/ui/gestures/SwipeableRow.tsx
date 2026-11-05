import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { platform } from '../../platform/index.ts';
import { IconButton } from '../actions/IconButton.tsx';
import { usePresence } from '../hooks/usePresence.ts';
import { useLongPress } from '../hooks/useLongPress.ts';
import { prefersReducedMotion } from '../hooks/useReducedMotion.ts';
import { IconMore } from '../icons.tsx';
import { useUiLabels } from '../labels.ts';
import { Menu, type MenuItem } from '../overlays/Menu.tsx';
import { cx } from '../utils/cx.ts';
import { isRtl } from '../utils/dom.ts';
import { VelocityTracker } from './physics.ts';
import {
  armedAction,
  detectSwipeAxis,
  resolveSwipeRelease,
  swipeOffset,
  type SwipeSide,
  type SwipeTarget,
} from './swipe.ts';
import s from './SwipeableRow.module.css';

export type SwipeTone = 'accent' | 'success' | 'warning' | 'danger' | 'create' | 'neutral';

export interface SwipeAction {
  id: string;
  /** Verb shown under the icon and used in the keyboard/screen-reader menu. */
  label: string;
  icon: ReactNode;
  tone?: SwipeTone;
  /**
   * The row leaves the list when committed (archive, delete): it flies out before `onAction`
   * runs. Otherwise it springs back (snooze, flag). Default `false`.
   */
  removes?: boolean;
  onAction: () => void;
}

export interface SwipeableRowProps {
  children: ReactNode;
  /** Revealed when swiping towards the end edge (right in LTR). Up to 2: short then long swipe. */
  leading?: readonly SwipeAction[];
  /** Revealed when swiping towards the start edge (left in LTR). Up to 2. */
  trailing?: readonly SwipeAction[];
  /** Accessible name of the actions menu, e.g. "Actions pour « Écrire l'intro »". */
  menuLabel?: string;
  /** Disable gestures (the menu stays). */
  disabled?: boolean;
  /** Root class. The resting row background comes from `--swipe-row-bg` (default `--surface`). */
  className?: string;
}

/**
 * Spark-style swipeable row: short swipe arms the first action, long swipe the second, haptic
 * tick when crossing a threshold, rubber-banding beyond the edge, flick to commit. Keyboard and
 * screen-reader users get the same actions from a menu button (also opened by long-press /
 * right-click / Shift+F10).
 */
export function SwipeableRow({
  children,
  leading = [],
  trailing = [],
  menuLabel,
  disabled = false,
  className,
}: SwipeableRowProps) {
  const labels = useUiLabels();
  const rootRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Measured at gesture start; render reads state, not the DOM.
  const [{ width, rtl }, setBox] = useState({ width: 0, rtl: false });
  const gesture = useRef<{
    x: number;
    y: number;
    width: number;
    rtl: boolean;
    axis: 'x' | 'y' | null;
    armed: SwipeTarget | null;
  } | null>(null);
  const tracker = useRef(new VelocityTracker());
  // Set once a horizontal swipe starts; swallows the click that follows the release.
  const swiped = useRef(false);
  const presence = usePresence<HTMLDivElement>(!removed);
  const counts = { leading: leading.length, trailing: trailing.length };
  const longPress = useLongPress<HTMLDivElement>(() => setMenuOpen(true));

  const actionFor = (t: SwipeTarget | null) =>
    t ? (t.side === 'leading' ? leading : trailing)[t.index] : undefined;

  const commit = (action: SwipeAction, side: SwipeSide, width: number, rtl: boolean) => {
    platform.haptic(action.removes ? 'success' : 'light');
    if (action.removes && !prefersReducedMotion()) {
      const dir = (side === 'leading' ? 1 : -1) * (rtl ? -1 : 1);
      setSettling(true);
      setOffset(dir * width * 1.1);
      window.setTimeout(() => {
        setRemoved(true);
        action.onAction();
      }, 200);
      return;
    }
    setSettling(true);
    setOffset(0);
    action.onAction();
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    longPress.onPointerDown(e);
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const el = rootRef.current;
    if (!el) return;
    swiped.current = false;
    gesture.current = {
      x: e.clientX,
      y: e.clientY,
      width: el.offsetWidth,
      rtl: isRtl(el),
      axis: null,
      armed: null,
    };
    tracker.current.reset();
    setBox({ width: el.offsetWidth, rtl: isRtl(el) });
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    longPress.onPointerMove(e);
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    if (g.axis === null) {
      g.axis = detectSwipeAxis(dx, e.clientY - g.y);
      if (g.axis === 'x') {
        swiped.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setSettling(false);
      }
      if (g.axis !== 'x') {
        if (g.axis === 'y') gesture.current = null;
        return;
      }
    }
    const raw = g.rtl ? -dx : dx;
    tracker.current.add(raw, e.timeStamp);
    const next = swipeOffset(raw, g.width, counts);
    const armed = armedAction(next, g.width, counts);
    if (armed?.side !== g.armed?.side || armed?.index !== g.armed?.index) {
      if (armed) platform.haptic('selection');
      g.armed = armed;
    }
    setOffset(g.rtl ? -next : next);
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    longPress.onPointerUp(e);
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.axis !== 'x') return;
    const logical = g.rtl ? -offset : offset;
    const target = resolveSwipeRelease(
      logical,
      tracker.current.velocity(e.timeStamp),
      g.width,
      counts,
    );
    const action = actionFor(target);
    if (target && action) commit(action, target.side, g.width, g.rtl);
    else {
      setSettling(true);
      setOffset(0);
    }
  };

  if (!presence.mounted) return null;

  const logicalOffset = rtl ? -offset : offset;
  const armed = armedAction(logicalOffset, width, counts);
  const side: SwipeSide | null =
    logicalOffset > 0 ? 'leading' : logicalOffset < 0 ? 'trailing' : null;
  const revealed = side ? actionFor(armed ?? { side, index: 0 }) : undefined;
  const all = [...leading, ...trailing];
  const menuItems: MenuItem[] = all.map((a) => ({
    id: a.id,
    label: a.label,
    icon: a.icon,
    danger: a.tone === 'danger',
    onSelect: () => {
      if (a.removes) setRemoved(true);
      a.onAction();
    },
  }));

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        presence.ref(node);
      }}
      className={cx(s.root, className)}
      data-state={presence.state}
      data-swiping={offset !== 0 || undefined}
    >
      {revealed && side && (
        <div
          className={cx(s.underlay, s[side], s[revealed.tone ?? 'neutral'], armed && s.armed)}
          aria-hidden="true"
        >
          <span className={s.actionIcon}>{revealed.icon}</span>
          <span className={s.actionLabel}>{revealed.label}</span>
        </div>
      )}
      <div
        className={cx(s.content, settling && s.settling)}
        style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={longPress.onPointerLeave}
        onContextMenu={longPress.onContextMenu}
        onClickCapture={(e) => {
          longPress.onClickCapture(e);
          // A swipe is not a click on the row.
          if (swiped.current || Math.abs(offset) > 2) {
            swiped.current = false;
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onTransitionEnd={() => setSettling(false)}
      >
        {children}
      </div>
      {all.length > 0 && (
        <Menu
          label={menuLabel ?? labels.more}
          items={menuItems}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          trigger={
            <IconButton
              className={s.menuButton}
              label={menuLabel ?? labels.more}
              icon={<IconMore />}
              size="sm"
            />
          }
        />
      )}
    </div>
  );
}
