import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useControllableState } from '../hooks/useControllableState.ts';
import { usePresence } from '../hooks/usePresence.ts';
import { IconCheck } from '../icons.tsx';
import { Kbd } from '../display/Kbd.tsx';
import { cx } from '../utils/cx.ts';
import { focusElement } from '../utils/dom.ts';
import { Portal } from '../utils/Portal.tsx';
import { nextRovingIndex, typeaheadIndex } from '../utils/roving.ts';
import type { Placement } from './position.ts';
import { cloneTrigger } from './trigger.ts';
import { useAnchoredPosition } from './useAnchoredPosition.ts';
import { useDismiss } from './useDismiss.ts';
import s from './Overlay.module.css';

export interface MenuActionItem {
  type?: 'action';
  id: string;
  label: string;
  icon?: ReactNode;
  /** Shortcut hint in `useHotkeys` syntax (display only). */
  shortcut?: string;
  /** Destructive styling (still reversible via undo, ideally). */
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface MenuCheckboxItem {
  type: 'checkbox';
  id: string;
  label: string;
  icon?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export interface MenuSeparator {
  type: 'separator';
  id: string;
}

export type MenuItem = MenuActionItem | MenuCheckboxItem | MenuSeparator;

export interface MenuProps {
  /** The button that opens the menu (receives `aria-haspopup="menu"`, `aria-expanded`). */
  trigger: ReactElement;
  /** Accessible name of the menu. */
  label: string;
  items: readonly MenuItem[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Default `bottom-end`. */
  placement?: Placement;
  className?: string;
}

type Focusable = Exclude<MenuItem, MenuSeparator>;
const isFocusable = (item: MenuItem): item is Focusable => item.type !== 'separator';

/**
 * Action menu (WAI-ARIA menu button): roving tabindex, ↑/↓/Home/End, typeahead, Enter/Space,
 * Escape and Tab close and return focus to the trigger, click outside closes.
 */
export function Menu({
  trigger,
  label,
  items,
  open,
  defaultOpen = false,
  onOpenChange,
  placement = 'bottom-end',
  className,
}: MenuProps) {
  const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange);
  const id = useId();
  const triggerRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const presence = usePresence<HTMLDivElement>(isOpen);
  const pos = useAnchoredPosition(isOpen, triggerRef, layerRef, placement, 6);
  const focusables = items.filter(isFocusable);
  const [active, setActive] = useState(0);
  const typed = useRef({ query: '', at: 0 });

  const firstEnabled = () => focusables.findIndex((i) => !i.disabled);
  const lastEnabled = () => {
    for (let i = focusables.length - 1; i >= 0; i--) if (!focusables[i]!.disabled) return i;
    return -1;
  };

  const openAt = (index: number) => {
    setActive(Math.max(0, index));
    setOpen(true);
  };
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) focusElement(triggerRef.current);
  };

  useDismiss({
    open: isOpen,
    layerRef,
    insideRefs: [triggerRef],
    onEscape: () => close(true),
    onOutside: () => close(false),
  });

  useEffect(() => {
    if (isOpen) focusElement(itemRefs.current[active]);
  }, [isOpen, active]);

  const activate = (item: Focusable) => {
    if (item.disabled) return;
    if (item.type === 'checkbox') {
      item.onCheckedChange(!item.checked);
      return;
    }
    close(true);
    item.onSelect();
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const isDisabled = (i: number) => !!focusables[i]?.disabled;
    if (e.key === 'Tab') {
      e.preventDefault();
      close(true);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const item = focusables[active];
      if (item) activate(item);
      return;
    }
    const next = nextRovingIndex(active, e.key, focusables.length, {
      orientation: 'vertical',
      isDisabled,
    });
    if (next !== null) {
      e.preventDefault();
      setActive(next);
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = e.timeStamp;
      const t = typed.current;
      t.query = now - t.at < 500 ? t.query + e.key : e.key;
      t.at = now;
      const match = typeaheadIndex(
        focusables.map((i) => i.label),
        t.query,
        active,
        isDisabled,
      );
      if (match !== null) setActive(match);
    }
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAt(firstEnabled());
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openAt(lastEnabled());
    }
  };

  let focusIndex = -1;
  return (
    <>
      {cloneTrigger(trigger, {
        ref: triggerRef,
        'aria-haspopup': 'menu',
        'aria-expanded': isOpen,
        'aria-controls': isOpen ? id : undefined,
        onClick: () => (isOpen ? close(false) : openAt(firstEnabled())),
        onKeyDown: onTriggerKeyDown,
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
              ref={presence.ref}
              id={id}
              role="menu"
              aria-label={label}
              data-state={presence.state}
              className={cx(s.popover, s.menu, className)}
              style={{ transformOrigin: pos?.origin }}
              onKeyDown={onMenuKeyDown}
            >
              {items.map((item) => {
                if (item.type === 'separator')
                  return <div key={item.id} role="separator" className={s.separator} />;
                const index = ++focusIndex;
                const checkbox = item.type === 'checkbox';
                return (
                  <div
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    role={checkbox ? 'menuitemcheckbox' : 'menuitem'}
                    aria-checked={checkbox ? item.checked : undefined}
                    aria-disabled={item.disabled || undefined}
                    tabIndex={index === active ? 0 : -1}
                    className={cx(s.item, !checkbox && item.danger && s.danger)}
                    onClick={() => activate(item)}
                    onPointerMove={() => {
                      if (!item.disabled && index !== active) setActive(index);
                    }}
                  >
                    <span className={s.itemIcon} aria-hidden="true">
                      {checkbox ? item.checked && <IconCheck size={18} /> : item.icon}
                    </span>
                    <span className={s.itemLabel}>{item.label}</span>
                    {!checkbox && item.shortcut && (
                      <span className={s.itemShortcut} aria-hidden="true">
                        <Kbd keys={item.shortcut} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
