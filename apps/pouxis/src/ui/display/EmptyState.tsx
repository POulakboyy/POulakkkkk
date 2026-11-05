import type { ReactNode } from 'react';
import { cx } from '../utils/cx.ts';
import s from './EmptyState.module.css';

export interface EmptyStateProps {
  /** Icon or small illustration (decorative). */
  icon?: ReactNode;
  title: ReactNode;
  /** One or two sentences: why it is empty and what to do next. */
  description?: ReactNode;
  /** Primary next step (usually a {@link Button}). */
  action?: ReactNode;
  /** Secondary action or link. */
  secondaryAction?: ReactNode;
  /** Heading level for the title. Default 2. */
  level?: 2 | 3;
  /** `compact` for panels and lists, `page` for whole views. Default `page`. */
  size?: 'compact' | 'page';
  className?: string;
}

/** Calm, encouraging placeholder for a view or list with nothing to show yet. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  level = 2,
  size = 'page',
  className,
}: EmptyStateProps) {
  const Heading = `h${level}` as const;
  return (
    <section className={cx(s.root, s[size], className)}>
      {icon && (
        <div className={s.icon} aria-hidden="true">
          {icon}
        </div>
      )}
      <Heading className={s.title}>{title}</Heading>
      {description && <p className={s.description}>{description}</p>}
      {(action || secondaryAction) && (
        <div className={s.actions}>
          {action}
          {secondaryAction}
        </div>
      )}
    </section>
  );
}
