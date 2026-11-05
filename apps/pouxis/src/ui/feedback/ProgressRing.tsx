import type { ReactNode } from 'react';
import { cx } from '../utils/cx.ts';
import s from './Progress.module.css';

export type ProgressTone = 'accent' | 'mode' | 'success' | 'create' | 'execute';

export interface ProgressRingProps {
  /** Progress 0–1 (clamped). */
  value: number;
  /** Accessible name, e.g. "Objectif du jour". */
  label: string;
  /** Spoken value, e.g. "3 tâches sur 5". Default: a percentage. */
  valueText?: string;
  /** Diameter in px. Default 56. */
  size?: number;
  /** Stroke width in px. Default size / 9. */
  thickness?: number;
  /** Default `accent`. */
  tone?: ProgressTone;
  /**
   * Split the ring into equal segments (Instagram story / habit streak style); `value` then
   * fills whole segments, rounded down.
   */
  segments?: number;
  /** Centre content (avatar, number, icon). */
  children?: ReactNode;
  className?: string;
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

/** Geometry for a segmented ring: dash length and gap (px) for `count` segments on circumference `c`. */
export function segmentDash(
  c: number,
  count: number,
  gap: number,
): { dash: number; space: number } {
  if (count <= 1) return { dash: c, space: 0 };
  const space = Math.min(gap, c / count / 2);
  return { dash: c / count - space, space };
}

/** Circular progress (activity ring). Changes are instant — no stroke animation. */
export function ProgressRing({
  value,
  label,
  valueText,
  size = 56,
  thickness,
  tone = 'accent',
  segments,
  children,
  className,
}: ProgressRingProps) {
  const v = clamp01(value);
  const stroke = thickness ?? Math.max(3, Math.round(size / 9));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;
  const seg = segments && segments > 1 ? segmentDash(c, segments, stroke * 0.9) : null;
  const filledSegments = seg ? Math.floor(v * segments! + 1e-9) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-valuetext={valueText}
      className={cx(s.ring, s[tone], className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className={s.svg}
      >
        <circle
          className={s.track}
          cx={center}
          cy={center}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={seg ? `${seg.dash} ${seg.space}` : undefined}
        />
        {seg ? (
          Array.from({ length: filledSegments }, (_, i) => (
            <circle
              key={i}
              className={s.value}
              cx={center}
              cy={center}
              r={r}
              strokeWidth={stroke}
              strokeDasharray={`${seg.dash} ${c - seg.dash}`}
              strokeDashoffset={-i * (seg.dash + seg.space)}
            />
          ))
        ) : (
          <circle
            className={s.value}
            cx={center}
            cy={center}
            r={r}
            strokeWidth={stroke}
            strokeLinecap={v > 0 ? 'round' : 'butt'}
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - v)}
            opacity={v > 0 ? 1 : 0}
          />
        )}
      </svg>
      {children && <div className={s.center}>{children}</div>}
    </div>
  );
}
