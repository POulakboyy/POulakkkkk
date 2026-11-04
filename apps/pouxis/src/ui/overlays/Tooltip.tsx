import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { usePresence } from '../hooks/usePresence.ts';
import { Kbd } from '../display/Kbd.tsx';
import { Portal } from '../utils/Portal.tsx';
import type { Placement } from './position.ts';
import { cloneTrigger } from './trigger.ts';
import { useAnchoredPosition } from './useAnchoredPosition.ts';
import { pushLayer } from './layers.ts';
import s from './Overlay.module.css';

export interface TooltipProps {
  /** Short supplementary text. Never the only name of a control — label it too. */
  content: ReactNode;
  /** Shortcut hint shown after the text (`useHotkeys` syntax). */
  shortcut?: string;
  /** A single focusable element. */
  children: ReactElement;
  /** Default `top`. */
  placement?: Placement;
  /** Hover delay in ms (focus shows immediately). Default 500. */
  delay?: number;
}

// Moving between controls right after a tooltip closed shows the next one instantly.
let lastHiddenAt = 0;
const WARM_MS = 400;

/**
 * Tooltip on hover (mouse/pen) and keyboard focus — never on touch. Meets WCAG 1.4.13: it can
 * be dismissed with Escape, stays while hovered, and remains until the pointer or focus leaves.
 */
export function Tooltip({
  content,
  shortcut,
  children,
  placement = 'top',
  delay = 500,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const presence = usePresence<HTMLDivElement>(open);
  const pos = useAnchoredPosition(open, triggerRef, layerRef, placement, 8);

  const clear = () => window.clearTimeout(timer.current);
  const show = (wait: number) => {
    clear();
    const warm = Date.now() - lastHiddenAt < WARM_MS;
    if (wait <= 0 || warm) setOpen(true);
    else timer.current = window.setTimeout(() => setOpen(true), wait);
  };
  const hide = (wait = 0) => {
    clear();
    const run = () => {
      setOpen(false);
      lastHiddenAt = Date.now();
    };
    if (wait > 0) timer.current = window.setTimeout(run, wait);
    else run();
  };

  useEffect(() => clear, []);

  useEffect(() => {
    if (!open || !layerRef.current) return;
    return pushLayer({ node: layerRef.current, modal: false, onEscape: () => hide() });
  }, [open]);

  return (
    <>
      {cloneTrigger(children, {
        ref: triggerRef,
        'aria-describedby': id,
        onPointerEnter: (e: PointerEvent) => {
          if (e.pointerType !== 'touch') show(delay);
        },
        onPointerLeave: () => hide(100),
        onPointerDown: () => hide(),
        onFocus: (e: FocusEvent<HTMLElement>) => {
          if (e.currentTarget.matches(':focus-visible')) show(0);
        },
        onBlur: () => hide(),
      })}
      {presence.mounted ? (
        <Portal>
          <div
            ref={layerRef}
            className={s.floating}
            data-px-inert-exempt=""
            style={{
              transform: pos ? `translate3d(${pos.x}px, ${pos.y}px, 0)` : undefined,
              visibility: pos ? undefined : 'hidden',
            }}
            onPointerEnter={clear}
            onPointerLeave={() => hide(100)}
          >
            <div
              ref={presence.ref}
              id={id}
              role="tooltip"
              data-state={presence.state}
              className={s.tooltip}
              style={{ transformOrigin: pos?.origin }}
            >
              {content}
              {shortcut && <Kbd keys={shortcut} className={s.tooltipKbd} />}
            </div>
          </div>
        </Portal>
      ) : (
        <span id={id} hidden>
          {content}
        </span>
      )}
    </>
  );
}
