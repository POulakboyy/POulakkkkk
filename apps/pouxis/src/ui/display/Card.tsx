import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cx } from '../utils/cx.ts';
import s from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** `plain` surface · `elevated` soft shadow · `outlined` hairline · `tinted` paper tone. Default `plain`. */
  variant?: 'plain' | 'elevated' | 'outlined' | 'tinted';
  /** Inner padding. Default `md`. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Semantic element. Default `div`. */
  as?: 'div' | 'article' | 'section' | 'li';
  /**
   * Adds hover/press feedback for cards containing one primary link or button that is
   * stretched over the card (give that control the `cardLinkClassName`).
   */
  interactive?: boolean;
  /** Pastel category tint (`--cat-*`), e.g. for timeline cards. */
  category?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  children: ReactNode;
  ref?: Ref<HTMLElement>;
}

/** Class to put on the single main link/button of an `interactive` card: its hit area covers the card. */
export const cardLinkClassName = s.link ?? '';

/**
 * Rounded content container. For a clickable card, keep one real `<a>`/`<button>` inside with
 * {@link cardLinkClassName} so the card stays a single, well-named tab stop.
 */
export function Card({
  variant = 'plain',
  padding = 'md',
  as: Tag = 'div',
  interactive = false,
  category,
  className,
  style,
  children,
  ref,
  ...rest
}: CardProps) {
  return (
    <Tag
      // The polymorphic tag makes the ref an intersection type; the element is always an HTMLElement.
      ref={ref as never}
      className={cx(
        s.card,
        s[variant],
        s[`pad-${padding}`],
        interactive && s.interactive,
        className,
      )}
      style={category ? { ...style, ['--card-bg' as string]: `var(--cat-${category})` } : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
