import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { useControllableState } from '../hooks/useControllableState.ts';
import { cx } from '../utils/cx.ts';
import { isRtl } from '../utils/dom.ts';
import { nextRovingIndex } from '../utils/roving.ts';
import s from './Tabs.module.css';

export interface TabItem<V extends string> {
  value: V;
  label: ReactNode;
  /** Decorative icon before the label. */
  icon?: ReactNode;
  /** Small trailing element, e.g. a {@link Badge} count. */
  badge?: ReactNode;
  disabled?: boolean;
  /** Panel content. Omit to drive the content yourself (then only the tab list renders). */
  panel?: ReactNode;
}

export interface TabsProps<V extends string> {
  /** Accessible name of the tab list. */
  label: string;
  items: readonly TabItem<V>[];
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  /**
   * `automatic` (default) selects on arrow keys; `manual` moves focus only and selects on
   * Enter/Space — use it when showing a panel is expensive.
   */
  activation?: 'automatic' | 'manual';
  /** Keep inactive panels mounted (hidden). Default `false`. */
  keepMounted?: boolean;
  className?: string;
  /** Class for the tab list (e.g. sticky positioning). */
  listClassName?: string;
}

/**
 * WAI-ARIA tabs with an underline that slides (translate + scale) between tabs.
 *
 * @example <Tabs label="Sections" items={[{ value: 'all', label: 'Tout', panel: <All /> }]} />
 */
export function Tabs<V extends string>({
  label,
  items,
  value,
  defaultValue,
  onChange,
  activation = 'automatic',
  keepMounted = false,
  className,
  listClassName,
}: TabsProps<V>) {
  const [current, setCurrent] = useControllableState<V>(
    value,
    defaultValue ?? (items.find((i) => !i.disabled)?.value as V),
    onChange,
  );
  const base = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(
    0,
    items.findIndex((i) => i.value === current),
  );
  const [focusIndex, setFocusIndex] = useState(selectedIndex);
  const indicator = useIndicator(listRef, tabRefs, selectedIndex, items.length);
  const tabId = (i: number) => `${base}-tab-${i}`;
  const panelId = (i: number) => `${base}-panel-${i}`;
  const hasPanels = items.some((i) => i.panel !== undefined);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = tabRefs.current.findIndex((el) => el === document.activeElement);
    const origin = from >= 0 ? from : selectedIndex;
    if (activation === 'manual' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const item = items[origin];
      if (item && !item.disabled) setCurrent(item.value);
      return;
    }
    const next = nextRovingIndex(origin, e.key, items.length, {
      rtl: isRtl(e.currentTarget),
      isDisabled: (i) => !!items[i]?.disabled,
    });
    if (next === null) return;
    e.preventDefault();
    setFocusIndex(next);
    tabRefs.current[next]?.focus();
    const item = items[next];
    if (activation === 'automatic' && item) setCurrent(item.value);
  };

  const tabbable = activation === 'manual' ? focusIndex : selectedIndex;

  return (
    <div className={cx(s.root, className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        className={cx(s.list, listClassName)}
        onKeyDown={onKeyDown}
      >
        {items.map((item, i) => {
          const selected = i === selectedIndex;
          return (
            <button
              key={item.value}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={tabId(i)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={item.panel !== undefined ? panelId(i) : undefined}
              tabIndex={i === tabbable ? 0 : -1}
              disabled={item.disabled}
              className={s.tab}
              onFocus={() => setFocusIndex(i)}
              onClick={() => setCurrent(item.value)}
            >
              {item.icon && (
                <span className={s.icon} aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span>{item.label}</span>
              {item.badge}
            </button>
          );
        })}
        <span
          className={s.indicator}
          aria-hidden="true"
          style={{
            transform: `translateX(${indicator.left}px) scaleX(${indicator.width})`,
            opacity: indicator.width > 0 ? 1 : 0,
          }}
        />
      </div>
      {hasPanels &&
        items.map((item, i) => {
          const selected = i === selectedIndex;
          if (!selected && !keepMounted) return null;
          return (
            <div
              key={item.value}
              id={panelId(i)}
              role="tabpanel"
              aria-labelledby={tabId(i)}
              hidden={!selected}
              tabIndex={0}
              className={s.panel}
            >
              {item.panel}
            </div>
          );
        })}
    </div>
  );
}

/** Measures the selected tab so the 1 px-wide indicator can be translated and scaled onto it. */
function useIndicator(
  listRef: RefObject<HTMLDivElement | null>,
  tabRefs: RefObject<(HTMLButtonElement | null)[]>,
  index: number,
  count: number,
): { left: number; width: number } {
  const [box, setBox] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const tab = tabRefs.current[index];
      if (!tab) return;
      const next = { left: tab.offsetLeft, width: tab.offsetWidth };
      setBox((prev) => (prev.left === next.left && prev.width === next.width ? prev : next));
    };
    measure();
    const list = listRef.current;
    const ro = typeof ResizeObserver === 'function' && list ? new ResizeObserver(measure) : null;
    if (list) ro?.observe(list);
    return () => ro?.disconnect();
  }, [listRef, tabRefs, index, count]);
  return box;
}
