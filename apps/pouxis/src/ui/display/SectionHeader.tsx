import type { ReactNode } from 'react';
import { cx } from '../utils/cx.ts';
import s from './SectionHeader.module.css';

export interface SectionHeaderProps {
  title: ReactNode;
  /** Small caps line above the title (date, category). */
  eyebrow?: ReactNode;
  /** Supporting sentence under the title. */
  subtitle?: ReactNode;
  /** Trailing action, e.g. a ghost "Tout voir" button or a link. */
  action?: ReactNode;
  /** Heading level, chosen for the document outline — independent from `size`. Default 2. */
  level?: 1 | 2 | 3;
  /** `display` editorial serif (view titles) · `lg` serif section · `md` sans subsection. Default `lg`. */
  size?: 'display' | 'lg' | 'md';
  id?: string;
  className?: string;
}

/**
 * Editorial heading block (Apple Music-style large titles): serif display type, optional eyebrow,
 * subtitle and a trailing action aligned to the baseline.
 */
export function SectionHeader({
  title,
  eyebrow,
  subtitle,
  action,
  level = 2,
  size = 'lg',
  id,
  className,
}: SectionHeaderProps) {
  const Heading = `h${level}` as const;
  return (
    <header className={cx(s.header, s[size], className)}>
      <div className={s.text}>
        {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
        <Heading id={id} className={s.title}>
          {title}
        </Heading>
        {subtitle && <p className={s.subtitle}>{subtitle}</p>}
      </div>
      {action && <div className={s.action}>{action}</div>}
    </header>
  );
}
