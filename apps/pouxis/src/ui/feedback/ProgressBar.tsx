import { cx } from '../utils/cx.ts';
import type { ProgressTone } from './ProgressRing.tsx';
import s from './Progress.module.css';

export interface ProgressBarProps {
  /** Progress 0–1 (clamped). Omit for an indeterminate bar. */
  value?: number;
  /** Accessible name. Shown above the bar unless `hideLabel`. */
  label: string;
  hideLabel?: boolean;
  /** Spoken/visible value, e.g. "12 min restantes". Default: a percentage. */
  valueText?: string;
  /** Show the value text on the label line. Default `false`. */
  showValue?: boolean;
  /** Default `accent`. */
  tone?: ProgressTone;
  /** Bar thickness. Default `md` (6 px). */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Linear progress. The fill is scaled with `transform: scaleX()` — compositor-only. */
export function ProgressBar({
  value,
  label,
  hideLabel = false,
  valueText,
  showValue = false,
  tone = 'accent',
  size = 'md',
  className,
}: ProgressBarProps) {
  const indeterminate = value === undefined;
  const v = indeterminate ? 0 : Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const text = valueText ?? `${Math.round(v * 100)} %`;
  return (
    <div className={cx(s.barRoot, className)}>
      {(!hideLabel || showValue) && (
        <div className={s.barLabel} aria-hidden="true">
          {!hideLabel && <span>{label}</span>}
          {showValue && !indeterminate && <span className={s.barValue}>{text}</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={indeterminate ? undefined : 0}
        aria-valuemax={indeterminate ? undefined : 100}
        aria-valuenow={indeterminate ? undefined : Math.round(v * 100)}
        aria-valuetext={indeterminate ? undefined : valueText}
        className={cx(s.bar, s[tone], s[`bar-${size}`], indeterminate && s.indeterminate)}
      >
        <span
          className={s.fill}
          style={indeterminate ? undefined : { transform: `scaleX(${v})` }}
        />
      </div>
    </div>
  );
}
