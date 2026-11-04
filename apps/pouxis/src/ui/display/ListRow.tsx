import type { HTMLAttributes, MouseEventHandler, ReactNode, Ref } from 'react';
import { IconChevronRight } from '../icons.tsx';
import { cx } from '../utils/cx.ts';
import s from './ListRow.module.css';

export interface ListRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'onClick'> {
  /** Main text. */
  title: ReactNode;
  /** Secondary line (one line, truncated). */
  description?: ReactNode;
  /** Leading slot: icon, avatar, checkbox… May be interactive (it sits above the row's hit area). */
  leading?: ReactNode;
  /** Trailing slot: value, badge, switch, icon button… May be interactive. */
  trailing?: ReactNode;
  /** Small text right-aligned before `trailing` (time, count). */
  meta?: ReactNode;
  /** Makes the whole row a button (the title names it). */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Makes the whole row a link. */
  href?: string;
  /** Shows a disclosure chevron (navigation rows). Default: on when `href` is set. */
  chevron?: boolean;
  /** Marks the row as current/selected (`aria-current` on links, a tinted background). */
  selected?: boolean;
  disabled?: boolean;
  /** Draw a hairline under the row (inset to the text). Default `false`. */
  divider?: boolean;
  /** Pass-through attributes for the inner button/link (e.g. `aria-haspopup`). */
  actionProps?: HTMLAttributes<HTMLElement> & Record<`data-${string}`, string>;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Settings/list row with leading, title, description, meta and trailing slots. When clickable,
 * a single button/link covers the row while leading/trailing controls stay independently
 * operable — no nested interactive elements.
 */
export function ListRow({
  title,
  description,
  leading,
  trailing,
  meta,
  onClick,
  href,
  chevron,
  selected = false,
  disabled = false,
  divider = false,
  actionProps,
  className,
  ref,
  ...rest
}: ListRowProps) {
  const interactive = !!onClick || !!href;
  const showChevron = chevron ?? !!href;
  const text = (
    <span className={s.text}>
      <span className={s.title}>{title}</span>
      {description && <span className={s.description}>{description}</span>}
    </span>
  );
  return (
    <div
      ref={ref}
      className={cx(
        s.row,
        interactive && s.interactive,
        selected && s.selected,
        disabled && s.disabled,
        divider && s.divider,
        className,
      )}
      {...rest}
    >
      {leading && <span className={s.leading}>{leading}</span>}
      {href ? (
        <a
          className={s.action}
          href={disabled ? undefined : href}
          aria-current={selected ? 'page' : undefined}
          aria-disabled={disabled || undefined}
          {...actionProps}
        >
          {text}
        </a>
      ) : onClick ? (
        <button
          type="button"
          className={s.action}
          onClick={onClick}
          disabled={disabled}
          {...actionProps}
        >
          {text}
        </button>
      ) : (
        text
      )}
      {meta !== undefined && <span className={s.meta}>{meta}</span>}
      {trailing && <span className={s.trailing}>{trailing}</span>}
      {showChevron && (
        <span className={s.chevron} aria-hidden="true">
          <IconChevronRight size={18} />
        </span>
      )}
    </div>
  );
}
