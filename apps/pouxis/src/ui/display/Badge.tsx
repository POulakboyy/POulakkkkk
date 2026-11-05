import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.ts';
import s from './Badge.module.css';

export type BadgeTone =
  'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'create' | 'execute';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Meaning colour — always paired with a word or icon, never colour alone. Default `neutral`. */
  tone?: BadgeTone;
  /** `soft` tinted (default) · `solid` filled · `outline`. */
  variant?: 'soft' | 'solid' | 'outline';
  /** Leading icon (decorative). */
  icon?: ReactNode;
  /** Renders a numeric counter (`max+` above `max`). Replaces `children`. */
  count?: number;
  /** Upper bound for `count`. Default 99. */
  max?: number;
  /** Prefix a small status dot. */
  dot?: boolean;
  children?: ReactNode;
}

/** Formats a counter for a badge: `100` → `99+` with the default max. */
export function formatBadgeCount(count: number, max = 99): string {
  return count > max ? `${max}+` : String(Math.max(0, Math.floor(count)));
}

/** Small status label or counter. */
export function Badge({
  tone = 'neutral',
  variant = 'soft',
  icon,
  count,
  max = 99,
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cx(s.badge, s[tone], s[variant], count !== undefined && s.count, className)}
      {...rest}
    >
      {dot && <span className={s.dot} aria-hidden="true" />}
      {icon && (
        <span className={s.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      {count !== undefined ? formatBadgeCount(count, max) : children}
    </span>
  );
}
