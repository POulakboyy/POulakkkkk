import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx.ts';
import s from './VisuallyHidden.module.css';

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** Element to render. Default `span`. */
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'label' | 'p';
  /** Reveal the content when it receives keyboard focus (skip links). */
  focusable?: boolean;
}

/** Hides content visually while keeping it available to screen readers. */
export function VisuallyHidden({
  as: Tag = 'span',
  focusable = false,
  className,
  children,
  ...rest
}: VisuallyHiddenProps) {
  return (
    <Tag className={cx(s.hidden, focusable && s.focusable, className)} {...rest}>
      {children}
    </Tag>
  );
}
