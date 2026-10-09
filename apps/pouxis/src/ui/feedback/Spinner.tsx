import { cx } from '../utils/cx.ts';
import s from './Spinner.module.css';

export interface SpinnerProps {
  /** Diameter in px. Default 18. */
  size?: number;
  /** Accessible label. Omit when the surrounding control already says it is busy (`aria-busy`). */
  label?: string;
  className?: string;
}

/** Indeterminate busy indicator that inherits the text colour. */
export function Spinner({ size = 18, label, className }: SpinnerProps) {
  const stroke = Math.max(2, size / 9);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      className={cx(s.spinner, className)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle className={s.track} cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c * 0.3} ${c}`}
      />
    </svg>
  );
}
