import { useState } from 'react';
import { cx } from '../utils/cx.ts';
import s from './Avatar.module.css';

export interface AvatarProps {
  /** Person or space name: initials fallback and accessible name. */
  name: string;
  /** Image URL; falls back to initials if missing or broken. */
  src?: string;
  /** Diameter in px. Default 40. */
  size?: number;
  /** Instagram-style ring (e.g. unseen story, active focus session). */
  ring?: boolean;
  /** Decorative when the name is already written next to it. Default `false`. */
  decorative?: boolean;
  className?: string;
}

/** Up to two initials from a name: "Ada Lovelace" → "AL", "émile" → "É". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toLocaleUpperCase();
}

/** Stable category colour slot (1–8) for a name, so a person keeps the same tint everywhere. */
export function avatarSlot(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return (h % 8) + 1;
}

/** Round picture or initials on a stable pastel tint. */
export function Avatar({
  name,
  src,
  size = 40,
  ring = false,
  decorative = false,
  className,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;
  return (
    <span
      className={cx(s.avatar, ring && s.ring, className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        ['--avatar-bg' as string]: `var(--cat-${avatarSlot(name)})`,
      }}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
    >
      {showImage ? (
        <img className={s.image} src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
