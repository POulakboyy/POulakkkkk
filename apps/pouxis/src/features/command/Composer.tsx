import {
  useLayoutEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import type { nlp } from '@pouxis/core';
import { cx } from '../../ui/index.ts';
import { highlightSegments } from './capture.ts';
import s from './CommandBar.module.css';

export interface ComposerProps {
  value: string;
  onChange: (value: string, caret: number) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSelect?: (caret: number) => void;
  tokens: readonly nlp.ParseToken[];
  label: string;
  placeholder: string;
  inputRef?: Ref<HTMLTextAreaElement>;
  /** Combobox wiring: id of the listbox and of its active option. */
  controls?: string;
  activeDescendant?: string;
  describedBy?: string;
  /** Buttons shown in the toolbar under the text (voice, submit…). */
  toolbar?: ReactNode;
  /** Left side of the toolbar (hints, mode). */
  status?: ReactNode;
  maxRows?: number;
}

const MIN_HEIGHT = 28;

/**
 * Claude-style composer: a growing textarea over a mirror layer that paints the tokens the
 * parser recognised. The textarea text is transparent where the mirror draws, so selection,
 * caret, IME and screen readers keep working on the real field.
 */
export function Composer({
  value,
  onChange,
  onKeyDown,
  onSelect,
  tokens,
  label,
  placeholder,
  inputRef,
  controls,
  activeDescendant,
  describedBy,
  toolbar,
  status,
  maxRows = 8,
}: ComposerProps) {
  const local = useRef<HTMLTextAreaElement | null>(null);
  const mirror = useRef<HTMLDivElement | null>(null);
  const segments = useMemo(() => highlightSegments(value, tokens), [value, tokens]);

  useLayoutEffect(() => {
    const el = local.current;
    if (!el) return;
    el.style.height = 'auto';
    const line = parseFloat(getComputedStyle(el).lineHeight) || 24;
    const max = line * maxRows;
    el.style.height = `${Math.max(MIN_HEIGHT, Math.min(el.scrollHeight, max))}px`;
  }, [value, maxRows]);

  const setRefs = (el: HTMLTextAreaElement | null) => {
    local.current = el;
    if (typeof inputRef === 'function') inputRef(el);
    else if (inputRef) (inputRef as { current: HTMLTextAreaElement | null }).current = el;
  };

  return (
    <div className={s.composer}>
      <div className={s.field}>
        <div ref={mirror} className={cx(s.input, s.mirror)} aria-hidden="true">
          {segments.map((seg, i) =>
            seg.type ? (
              <mark key={i} className={s.token} data-type={seg.type}>
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
          {/* Keeps the last line's height when the text ends with a newline. */}
          {'​'}
        </div>
        <textarea
          ref={setRefs}
          className={cx(s.input, s.textarea)}
          value={value}
          rows={1}
          spellCheck
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="done"
          aria-label={label}
          aria-controls={controls}
          aria-activedescendant={activeDescendant}
          aria-describedby={describedBy}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
          onKeyDown={onKeyDown}
          onSelect={(e) => onSelect?.(e.currentTarget.selectionStart)}
          onScroll={(e) => {
            if (mirror.current) mirror.current.scrollTop = e.currentTarget.scrollTop;
          }}
        />
      </div>
      <div className={s.toolbar}>
        <div className={s.status}>{status}</div>
        <div className={s.tools}>{toolbar}</div>
      </div>
    </div>
  );
}
