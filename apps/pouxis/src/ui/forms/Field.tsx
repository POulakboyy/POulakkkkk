import { useId, type ReactNode } from 'react';
import { IconAlert } from '../icons.tsx';
import { cx } from '../utils/cx.ts';
import s from './Field.module.css';

export interface FieldRenderProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
  'aria-required': true | undefined;
}

export interface FieldProps {
  /** Visible label (always rendered for assistive tech; `hideLabel` hides it visually). */
  label: ReactNode;
  hideLabel?: boolean;
  /** Help text under the control. */
  hint?: ReactNode;
  /** Error message; marks the control invalid and replaces nothing — the hint stays. */
  error?: ReactNode;
  /** Shows "(facultatif)"-style text after the label, e.g. `t('common.state.optional')`. */
  optionalText?: string;
  required?: boolean;
  /** Extra content on the label line, e.g. a character counter. */
  labelAside?: ReactNode;
  id?: string | undefined;
  className?: string | undefined;
  children: (props: FieldRenderProps) => ReactNode;
}

/** Label + hint + error wiring shared by TextField and TextArea. */
export function Field({
  label,
  hideLabel = false,
  hint,
  error,
  optionalText,
  required = false,
  labelAside,
  id,
  className,
  children,
}: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx(s.field, className)}>
      <div className={cx(s.labelRow, hideLabel && s.srOnly)}>
        <label htmlFor={inputId} className={s.label}>
          {label}
          {optionalText && !required && <span className={s.optional}> ({optionalText})</span>}
        </label>
        {labelAside}
      </div>
      {children({
        id: inputId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })}
      {error && (
        <p id={errorId} className={s.error}>
          <IconAlert size={16} />
          <span>{error}</span>
        </p>
      )}
      {hint && (
        <p id={hintId} className={s.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
