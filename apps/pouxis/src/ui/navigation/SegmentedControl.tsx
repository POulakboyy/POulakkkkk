import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useControllableState } from '../hooks/useControllableState.ts';
import { platform } from '../../platform/index.ts';
import { cx } from '../utils/cx.ts';
import { isRtl } from '../utils/dom.ts';
import { nextRovingIndex } from '../utils/roving.ts';
import s from './SegmentedControl.module.css';

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  /** Decorative icon shown before the label (or alone with `iconOnly`). */
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<V extends string> {
  /** Accessible name of the radio group (e.g. "Vue"). */
  label: string;
  options: readonly SegmentOption<V>[];
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  /** Show icons only; labels remain the accessible names. */
  iconOnly?: boolean;
  /** Stretch to the container width. */
  fullWidth?: boolean;
  /** `sm` 32 px · `md` 40 px; the hit area stays ≥ 44 px. Default `md`. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * iOS-style segmented control: equal segments with an indicator that slides via `transform`.
 * Semantics of a radio group — Tab enters on the selected segment, arrows move and select.
 *
 * @example <SegmentedControl label="Vue" options={[{ value: 'day', label: 'Jour' }, …]} value={v} onChange={setV} />
 */
export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  defaultValue,
  onChange,
  iconOnly = false,
  fullWidth = false,
  size = 'md',
  className,
}: SegmentedControlProps<V>) {
  const [current, setCurrent] = useControllableState<V>(
    value,
    defaultValue ?? (options[0]?.value as V),
    onChange,
  );
  const name = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === current),
  );

  const select = (i: number) => {
    const option = options[i];
    if (!option || option.disabled) return;
    if (option.value !== current) platform.haptic('selection');
    setCurrent(option.value);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = nextRovingIndex(index, e.key, options.length, {
      orientation: 'both',
      rtl: isRtl(e.currentTarget),
      isDisabled: (i) => !!options[i]?.disabled,
    });
    if (next === null) return;
    e.preventDefault();
    select(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(s.root, fullWidth && s.full, size === 'sm' && s.sm, className)}
      style={{ ['--count' as string]: options.length, ['--index' as string]: index }}
      onKeyDown={onKeyDown}
    >
      <span className={s.indicator} aria-hidden="true" />
      {options.map((option, i) => {
        const checked = i === index;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={iconOnly ? option.label : undefined}
            title={iconOnly ? option.label : undefined}
            name={name}
            tabIndex={checked ? 0 : -1}
            disabled={option.disabled}
            className={s.segment}
            onClick={() => select(i)}
          >
            {option.icon && (
              <span className={s.icon} aria-hidden="true">
                {option.icon}
              </span>
            )}
            {!iconOnly && <span className={s.text}>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
