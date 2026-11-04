import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, Ref } from 'react';
import { IconClose } from '../icons.tsx';
import { cx } from '../utils/cx.ts';
import s from './Pill.module.css';

export interface PillProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  /** Toggle state (`aria-pressed`). Omit for a plain action pill. */
  selected?: boolean;
  /** Called with the next state when a toggle pill is pressed. */
  onSelectedChange?: (selected: boolean) => void;
  /** Leading icon (decorative). */
  icon?: ReactNode;
  /** Trailing count, e.g. the number of matching items. */
  count?: number;
  /** `sm` 32 px (44 px hit area) · `md` 40 px (44 px hit area). Default `md`. */
  size?: 'sm' | 'md';
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Rounded filter/category pill (Airbnb-style). As a toggle it exposes `aria-pressed`; group
 * several in a {@link PillGroup}.
 *
 * @example <Pill icon={<IconBolt />} selected={deep} onSelectedChange={setDeep}>Deep work</Pill>
 */
export function Pill({
  selected,
  onSelectedChange,
  icon,
  count,
  size = 'md',
  type = 'button',
  className,
  children,
  onClick,
  ref,
  ...rest
}: PillProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cx(s.pill, size === 'sm' && s.sm, className)}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented && selected !== undefined) onSelectedChange?.(!selected);
      }}
      {...rest}
    >
      {icon && (
        <span className={s.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
      {count !== undefined && <span className={s.count}>{count}</span>}
    </button>
  );
}

export interface PillGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Names the group for assistive tech (e.g. "Filtres"). */
  label: string;
  /** Lay pills on one horizontally scrolling line (default) or wrap them. */
  wrap?: boolean;
  children: ReactNode;
}

/** A labelled row of pills; scrolls horizontally on narrow screens, edge-faded. */
export function PillGroup({ label, wrap = false, className, children, ...rest }: PillGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx(s.group, wrap && s.wrap, className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  /** Leading icon or colour dot (decorative). */
  icon?: ReactNode;
  /** Shows a remove button; its accessible name is `removeLabel`. */
  onRemove?: () => void;
  /** Accessible name of the remove button, e.g. "Retirer l'étiquette Design". */
  removeLabel?: string;
  /** Pastel category fill, 1–8 (`--cat-*`). */
  category?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

/** Static tag (labels, contexts, people). Not interactive unless removable. */
export function Chip({
  children,
  icon,
  onRemove,
  removeLabel,
  category,
  className,
  style,
  ...rest
}: ChipProps) {
  return (
    <span
      className={cx(s.chip, category && s.tinted, className)}
      style={category ? { ...style, ['--chip-bg' as string]: `var(--cat-${category})` } : style}
      {...rest}
    >
      {icon && (
        <span className={s.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={s.chipLabel}>{children}</span>
      {onRemove && (
        <button
          type="button"
          className={s.remove}
          aria-label={removeLabel ?? String(children)}
          onClick={onRemove}
        >
          <IconClose size={14} />
        </button>
      )}
    </span>
  );
}
