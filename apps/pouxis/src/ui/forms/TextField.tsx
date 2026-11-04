import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { cx } from '../utils/cx.ts';
import { Field } from './Field.tsx';
import s from './Field.module.css';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: ReactNode;
  /** Hide the label visually (it stays the accessible name), e.g. a search box with an icon. */
  hideLabel?: boolean;
  hint?: ReactNode;
  /** Error message: sets `aria-invalid` and is announced through `aria-describedby`. */
  error?: ReactNode;
  /** Text after the label for optional fields, e.g. `t('common.state.optional')`. */
  optionalText?: string;
  /** Decorative icon inside the field, before the text. */
  iconStart?: ReactNode;
  /** Trailing element inside the field (unit, clear button). */
  trailing?: ReactNode;
  /** `md` 44 px · `lg` 52 px. Default `md`. */
  size?: 'md' | 'lg';
  /** Class for the outer wrapper. */
  wrapperClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

/** Single-line text input with label, hint and error. Default `type="text"`. */
export function TextField({
  label,
  hideLabel,
  hint,
  error,
  optionalText,
  iconStart,
  trailing,
  size = 'md',
  required,
  id,
  className,
  wrapperClassName,
  type = 'text',
  ref,
  ...rest
}: TextFieldProps) {
  return (
    <Field
      label={label}
      hideLabel={hideLabel ?? false}
      hint={hint}
      error={error}
      required={required ?? false}
      id={id}
      className={wrapperClassName}
      {...(optionalText ? { optionalText } : {})}
    >
      {(aria) => (
        <span className={cx(s.control, size === 'lg' && s.lg, !!error && s.invalid)}>
          {iconStart && (
            <span className={s.adornment} aria-hidden="true">
              {iconStart}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            required={required}
            className={cx(s.input, className)}
            {...aria}
            {...rest}
          />
          {trailing && <span className={s.trailing}>{trailing}</span>}
        </span>
      )}
    </Field>
  );
}
