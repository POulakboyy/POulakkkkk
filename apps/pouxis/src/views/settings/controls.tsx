import { useId, type ReactNode } from 'react';
import { IconButton, IconMinus, IconPlus, cx } from '../../ui/index.ts';
import s from './Settings.module.css';

/** A titled settings section (one card per section, Apple Settings–style). */
export function Group({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={`settings-${id}`} className={s.group} aria-labelledby={`settings-${id}-title`}>
      <h2 id={`settings-${id}-title`} className={s.groupTitle} tabIndex={-1}>
        {title}
      </h2>
      {description && <p className={s.groupDescription}>{description}</p>}
      <div className={s.card}>{children}</div>
    </section>
  );
}

/** Label + hint on the left, control on the right (stacked on phones). */
export function Row({
  label,
  hint,
  children,
  stacked = false,
  wide = false,
  labelFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
  /** Control under the text instead of beside it (wide controls). */
  stacked?: boolean;
  /** Control too wide to sit beside the text on phones: it moves below there. */
  wide?: boolean;
  labelFor?: string;
}) {
  const Label = labelFor ? 'label' : 'span';
  return (
    <div className={cx(s.row, stacked && s.rowStacked, wide && s.rowWide)}>
      <div className={s.rowText}>
        <Label className={s.rowLabel} htmlFor={labelFor}>
          {label}
        </Label>
        {hint && <span className={s.rowHint}>{hint}</span>}
      </div>
      {children !== undefined && <div className={s.rowControl}>{children}</div>}
    </div>
  );
}

/** − value + control for small integers. */
export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  decreaseLabel,
  increaseLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  const id = useId();
  return (
    <div className={s.stepper} role="group" aria-labelledby={id}>
      <span id={id} hidden>
        {label}
      </span>
      <IconButton
        size="sm"
        variant="secondary"
        label={decreaseLabel}
        icon={<IconMinus size={16} />}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      />
      <output className={s.stepperValue} aria-live="polite">
        {format(value)}
      </output>
      <IconButton
        size="sm"
        variant="secondary"
        label={increaseLabel}
        icon={<IconPlus size={16} />}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      />
    </div>
  );
}

export interface SelectOption<V extends string | number> {
  value: V;
  label: string;
}

/** Native select (best on every platform, including screen readers and phones). */
export function Select<V extends string | number>({
  id,
  value,
  options,
  onChange,
  label,
}: {
  id?: string;
  value: V;
  options: readonly SelectOption<V>[];
  onChange: (value: V) => void;
  /** Accessible name when no visible `<label htmlFor>` points at it. */
  label?: string;
}) {
  return (
    <select
      id={id}
      className={s.select}
      aria-label={label}
      value={String(value)}
      onChange={(e) => {
        const found = options.find((o) => String(o.value) === e.target.value);
        if (found) onChange(found.value);
      }}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
