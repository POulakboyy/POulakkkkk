import type { CSSProperties } from 'react';
import { cx } from '../utils/cx.ts';
import s from './Skeleton.module.css';

export interface SkeletonProps {
  /** `text` line · `rect` block · `circle` avatar. Default `text`. */
  shape?: 'text' | 'rect' | 'circle';
  /** CSS width (number = px). Default 100% (circle: height). */
  width?: number | string;
  /** CSS height (number = px). Default 1em for text, 96 px for rect, 40 px for circle. */
  height?: number | string;
  className?: string;
}

/**
 * Loading placeholder that pulses (opacity only). Decorative: put `aria-busy="true"` on the
 * region being loaded and keep a text alternative (e.g. a visually hidden "Chargement…").
 */
export function Skeleton({ shape = 'text', width, height, className }: SkeletonProps) {
  const h = height ?? (shape === 'circle' ? 40 : shape === 'rect' ? 96 : undefined);
  const style: CSSProperties = {
    width: width ?? (shape === 'circle' ? h : undefined),
    height: h,
  };
  return <span aria-hidden="true" className={cx(s.skeleton, s[shape], className)} style={style} />;
}

export interface SkeletonTextProps {
  /** Number of lines. Default 3. The last one is shorter. */
  lines?: number;
  className?: string;
}

/** A paragraph of skeleton lines. */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <span aria-hidden="true" className={cx(s.lines, className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 && lines > 1 ? '62%' : '100%'} />
      ))}
    </span>
  );
}
