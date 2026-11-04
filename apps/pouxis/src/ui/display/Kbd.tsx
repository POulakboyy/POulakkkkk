import { cx } from '../utils/cx.ts';
import { formatKey } from '../utils/keys.ts';
import s from './Kbd.module.css';

export interface KbdProps {
  /** Shortcut in `useHotkeys` syntax: `"mod+k"`, `"shift+?"`, `"esc"`. `mod` = ⌘ or Ctrl. */
  keys: string;
  className?: string;
}

/** Keyboard shortcut hint rendered with platform-correct symbols (⌘K on Apple, Ctrl K elsewhere). */
export function Kbd({ keys, className }: KbdProps) {
  const parts = keys.split(/\+(?!$)/).map((k) => formatKey(k.trim()));
  return (
    <kbd className={cx(s.kbd, className)}>
      {parts.map((p, i) => (
        <kbd key={i} className={s.key}>
          {p}
        </kbd>
      ))}
    </kbd>
  );
}
