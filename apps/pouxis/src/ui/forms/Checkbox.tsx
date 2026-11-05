import {
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { platform } from '../../platform/index.ts';
import { useControllableState } from '../hooks/useControllableState.ts';
import { cx } from '../utils/cx.ts';
import { mergeRefs } from '../utils/refs.ts';
import s from './Checkbox.module.css';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'checked' | 'defaultChecked' | 'size'
> {
  /** Visible label. Omit only with `aria-label` (e.g. a task row whose title labels it). */
  label?: ReactNode;
  /** Secondary line under the label. */
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Mixed state (some children checked). */
  indeterminate?: boolean;
  /** `square` (forms) or `circle` (task completion, Things-style). Default `square`. */
  shape?: 'square' | 'circle';
  /** Box size. Default `md` (22 px); hit area is always ≥ 44 px. */
  size?: 'md' | 'lg';
  /** Haptic tick when checked. Default `true`. */
  haptic?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Native checkbox with a custom box. The fill scales in and the tick pops in under 200 ms
 * (transform/opacity only) with a success haptic — a small, satisfying completion cue.
 */
export function Checkbox({
  label,
  description,
  checked,
  defaultChecked = false,
  onCheckedChange,
  indeterminate = false,
  shape = 'square',
  size = 'md',
  haptic = true,
  disabled,
  className,
  id,
  onChange,
  ref,
  ...rest
}: CheckboxProps) {
  const [isChecked, setChecked] = useControllableState(checked, defaultChecked, onCheckedChange);
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = description ? `${inputId}-desc` : undefined;
  const inner = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inner.current) inner.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <span className={cx(s.root, disabled && s.disabled, className)}>
      <span className={cx(s.control, s[shape], s[size])}>
        <input
          ref={mergeRefs(inner, ref)}
          id={inputId}
          type="checkbox"
          className={s.input}
          checked={isChecked}
          disabled={disabled}
          aria-describedby={descId}
          onChange={(e) => {
            onChange?.(e);
            if (e.defaultPrevented) return;
            const next = e.currentTarget.checked;
            if (next && haptic) platform.haptic('success');
            setChecked(next);
          }}
          {...rest}
        />
        <span className={s.box} aria-hidden="true">
          <span className={s.fill} />
          <svg className={s.tick} viewBox="0 0 24 24" fill="none">
            {indeterminate ? <path d="M6 12h12" /> : <path d="M5.5 12.5l4.2 4.2L18.5 7.8" />}
          </svg>
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
