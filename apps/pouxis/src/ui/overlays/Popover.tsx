import { useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react';
import { useControllableState } from '../hooks/useControllableState.ts';
import { usePresence } from '../hooks/usePresence.ts';
import { cx } from '../utils/cx.ts';
import { focusElement, getTabbable } from '../utils/dom.ts';
import { Portal } from '../utils/Portal.tsx';
import { mergeRefs } from '../utils/refs.ts';
import type { Placement } from './position.ts';
import { cloneTrigger } from './trigger.ts';
import { useAnchoredPosition } from './useAnchoredPosition.ts';
import { useDismiss } from './useDismiss.ts';
import s from './Overlay.module.css';

export interface PopoverProps {
  /** The element that toggles the popover (a button). Receives `aria-expanded`/`aria-controls`. */
  trigger: ReactElement;
  /** Content, or a render function receiving `close`. */
  children: ReactNode | ((api: { close: () => void }) => ReactNode);
  /** Accessible name of the popover dialog. */
  label: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Default `bottom-start`; flips when there is no room. */
  placement?: Placement;
  /** Gap to the trigger in px. Default 8. */
  offset?: number;
  className?: string;
}

/**
 * Non-modal floating panel anchored to a trigger (filters, quick settings). Closes on Escape
 * (focus returns to the trigger), outside click, or focus leaving it.
 */
export function Popover({
  trigger,
  children,
  label,
  open,
  defaultOpen = false,
  onOpenChange,
  placement = 'bottom-start',
  offset = 8,
  className,
}: PopoverProps) {
  const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange);
  const id = useId();
  const triggerRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const presence = usePresence<HTMLDivElement>(isOpen);
  const pos = useAnchoredPosition(isOpen, triggerRef, layerRef, placement, offset);
  const close = () => setOpen(false);

  useDismiss({
    open: isOpen,
    layerRef,
    insideRefs: [triggerRef],
    onEscape: () => {
      close();
      focusElement(triggerRef.current);
    },
    onOutside: close,
  });

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    focusElement(getTabbable(panel)[0] ?? panel);
  }, [isOpen]);

  return (
    <>
      {cloneTrigger(trigger, {
        ref: triggerRef,
        'aria-expanded': isOpen,
        'aria-haspopup': 'dialog',
        'aria-controls': isOpen ? id : undefined,
        onClick: () => setOpen(!isOpen),
      })}
      {presence.mounted && (
        <Portal>
          <div
            ref={layerRef}
            className={s.floating}
            style={{
              transform: pos ? `translate3d(${pos.x}px, ${pos.y}px, 0)` : undefined,
              visibility: pos ? undefined : 'hidden',
            }}
          >
            <div
              ref={mergeRefs(panelRef, presence.ref)}
              id={id}
              role="dialog"
              aria-label={label}
              tabIndex={-1}
              data-state={presence.state}
              className={cx(s.popover, className)}
              style={{ transformOrigin: pos?.origin }}
            >
              {typeof children === 'function' ? children({ close }) : children}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
