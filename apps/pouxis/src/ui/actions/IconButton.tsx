import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cx } from '../utils/cx.ts';
import { buttonClassName, type ButtonSize, type ButtonVariant } from './Button.tsx';
import s from './Button.module.css';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'aria-label'
> {
  /** Accessible name (required: an icon alone names nothing). Also shown as the native tooltip. */
  label: string;
  /** The icon, decorative (`aria-hidden` is applied). */
  icon: ReactNode;
  /** Default `ghost`. */
  variant?: ButtonVariant;
  /** `sm` 32 px (44 px hit area) · `md` 44 px · `lg` 52 px. Default `md`. */
  size?: ButtonSize;
  /** Makes it a toggle button (`aria-pressed`). */
  pressed?: boolean;
  /** Hide the native `title` tooltip (e.g. when wrapped in a {@link Tooltip}). */
  noTitle?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Square/round button holding a single icon. The label is mandatory and becomes `aria-label`.
 *
 * @example <IconButton label={t('common.close')} icon={<IconClose />} onClick={close} />
 */
export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  pressed,
  noTitle = false,
  type = 'button',
  className,
  ref,
  ...rest
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={noTitle ? undefined : label}
      aria-pressed={pressed}
      className={cx(buttonClassName({ variant, size }), s.iconButton, className)}
      {...rest}
    >
      <span className={s.layer} aria-hidden="true" />
      <span className={s.label} aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}
