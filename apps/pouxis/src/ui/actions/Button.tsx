import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Spinner } from '../feedback/Spinner.tsx';
import { cx } from '../utils/cx.ts';
import s from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-soft';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `primary` = coral accent pill (one per screen, the main action) · `secondary` = quiet filled
   * · `ghost` = text-only · `danger` = destructive confirmation · `danger-soft` = destructive but
   * reversible. Default `secondary`.
   */
  variant?: ButtonVariant;
  /** `sm` 36 px (44 px hit area) · `md` 44 px · `lg` 52 px. Default `md`. */
  size?: ButtonSize;
  /** Icon before the label (decorative; the label names the button). */
  iconStart?: ReactNode;
  /** Icon after the label (e.g. a chevron). */
  iconEnd?: ReactNode;
  /** Shows a spinner, keeps the width, sets `aria-busy` and blocks clicks while staying focusable. */
  loading?: boolean;
  /** Stretches to the container width. */
  fullWidth?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** Class names for an element styled as a button (e.g. an `<a>` link). */
export function buttonClassName({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
}: Pick<ButtonProps, 'variant' | 'size' | 'fullWidth'> = {}): string {
  return cx(s.button, fullWidth && s.full) + ` ${variant} ${size}`.replace(/ \S+ \S+$/, '');
}

/**
 * Pill button. Labels are verbs ("Archive", "Start focus"). Use one `primary` per view.
 *
 * @example <Button variant="primary" iconStart={<IconPlus />} onClick={add}>New task</Button>
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  iconStart,
  iconEnd,
  loading = false,
  fullWidth = false,
  type = 'button',
  className,
  children,
  onClick,
  disabled,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(s.button, fullWidth && s.full, className)}
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={(e) => {
        if (loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    >
      <span className={s.layer} aria-hidden="true" />
      <span className={s.label}>
        {iconStart && <span className={s.icon}>{iconStart}</span>}
        {children}
        {iconEnd && <span className={s.icon}>{iconEnd}</span>}
      </span>
      {loading && (
        <span className={s.busy} aria-hidden="true">
          <Spinner size={size === 'lg' ? 20 : 18} />
        </span>
      )}
    </button>
  );
}
