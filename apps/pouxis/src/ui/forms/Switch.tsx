import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { platform } from '../../platform/index.ts';
import { useControllableState } from '../hooks/useControllableState.ts';
import { cx } from '../utils/cx.ts';
import s from './Switch.module.css';

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'checked' | 'defaultChecked' | 'role'
> {
  /** Visible label. Omit only with `aria-label`. */
  label?: ReactNode;
  /** Secondary line under the label. */
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Put the label before the switch (settings rows). Default `false`. */
  labelFirst?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/** On/off toggle for settings that apply immediately (`role="switch"`). */
export function Switch({
  label,
  description,
  checked,
  defaultChecked = false,
  onCheckedChange,
  labelFirst = false,
  disabled,
  className,
  id,
  onChange,
  ref,
  ...rest
}: SwitchProps) {
  const [on, setOn] = useControllableState(checked, defaultChecked, onCheckedChange);
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = description ? `${inputId}-desc` : undefined;
  return (
    <span className={cx(s.root, labelFirst && s.labelFirst, disabled && s.disabled, className)}>
      <span className={s.control}>
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          role="switch"
          className={s.input}
          checked={on}
          disabled={disabled}
          aria-describedby={descId}
          onChange={(e) => {
            onChange?.(e);
            if (e.defaultPrevented) return;
            platform.haptic('selection');
            setOn(e.currentTarget.checked);
          }}
          {...rest}
        />
        <span className={s.track} aria-hidden="true">
          <span className={s.on} />
          <span className={s.thumb} />
        </span>
      </span>
      {(label || description) && (
        <span className={s.text}>
          {label && (
            <label htmlFor={inputId} className={s.label}>
              {label}
            </label>
          )}
          {description && (
            <span id={descId} className={s.description}>
              {description}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
