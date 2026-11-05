/**
 * Hybrid Markdown editor (5.11): every line is rendered (headings, emphasis, lists, links,
 * `[[wiki links]]`) except the one being edited, which shows its source — the Obsidian "live
 * preview" model. Typewriter mode (5.3) refuses every deletion. Leaving a line records a block
 * history snapshot (3.3).
 */
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from 'react';
import { cx } from '../../../ui/index.ts';
import { noteHistory } from '../lib/history.ts';
import {
  insertText,
  mergeWithNext,
  mergeWithPrevious,
  splitLine,
  toBody,
  toLines,
  toggleTask,
  type Edit,
} from '../lib/lines.ts';
import { parseLine } from '../lib/markdown.ts';
import { renderedOffsetAt, sourceOffset } from './caret.ts';
import { blockClass, RenderedLine, type WikiHandlers } from './RenderedLine.tsx';
import s from './Editor.module.css';

/** Delay before keystrokes are written to the store (one undo step per pause). */
export const SAVE_DELAY_MS = 400;

export interface HybridEditorHandle {
  /** Starts editing `line` (default: the first) with the caret at `caret` (default: end). */
  focusLine(line?: number, caret?: number): void;
  /** Replaces the whole body (block restore), as a user edit. */
  setLines(lines: string[]): void;
  lines(): readonly string[];
}

export interface HybridEditorProps {
  noteId: string;
  body: string;
  onChange: (body: string) => void;
  typewriter?: boolean;
  /** A deletion was refused by typewriter mode. */
  onBlocked?: () => void;
  wiki: WikiHandlers;
  label: string;
  placeholder: string;
  taskLabel: string;
  ref?: Ref<HybridEditorHandle>;
}

interface Active {
  line: number;
  caret: number;
  /** Changes on every request so the same caret can be applied twice. */
  nonce: number;
}

export function HybridEditor(props: HybridEditorProps) {
  const { noteId, body, onChange, typewriter = false, onBlocked, wiki } = props;
  const [lines, setLinesState] = useState(() => toLines(body));
  const [active, setActive] = useState<Active | null>(null);
  const linesRef = useRef(lines);
  const emitted = useRef(body);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switching = useRef(false);
  const nonce = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = toBody(linesRef.current);
    if (next !== emitted.current) {
      emitted.current = next;
      onChangeRef.current(next);
    }
  }, []);

  const commit = useCallback(
    (next: string[]) => {
      linesRef.current = next;
      setLinesState(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  // External changes (sync, undo, another window) replace the local copy.
  useEffect(() => {
    if (body === emitted.current) return;
    emitted.current = body;
    const next = toLines(body);
    linesRef.current = next;
    setLinesState(next);
  }, [body]);

  useEffect(() => flush, [flush]);

  const activeLine = active?.line;
  useEffect(() => {
    noteHistory.record(noteId, linesRef.current, Date.now());
  }, [noteId, activeLine]);

  const activate = useCallback((line: number, caret?: number) => {
    const target = Math.min(Math.max(0, line), linesRef.current.length - 1);
    const length = (linesRef.current[target] ?? '').length;
    switching.current = true;
    nonce.current += 1;
    setActive({ line: target, caret: Math.min(caret ?? length, length), nonce: nonce.current });
  }, []);

  const apply = useCallback(
    (edit: Edit) => {
      commit(edit.lines);
      activate(edit.line, edit.caret);
    },
    [commit, activate],
  );

  useImperativeHandle(
    props.ref,
    () => ({
      focusLine: (line = 0, caret) => activate(line, caret),
      setLines: (next) => {
        commit(next.length > 0 ? next : ['']);
        flush();
      },
      lines: () => linesRef.current,
    }),
    [activate, commit, flush],
  );

  const onLineMouseDown = (index: number, event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('a, button, input')) return;
    event.preventDefault();
    const line = linesRef.current[index] ?? '';
    const content = event.currentTarget.querySelector<HTMLElement>('[data-content]');
    const offset = content ? renderedOffsetAt(content, event.clientX, event.clientY) : null;
    if (offset === null || !content) {
      activate(index);
      return;
    }
    const block = parseLine(line);
    activate(
      index,
      block.marker.length + sourceOffset(block.content, content.textContent ?? '', offset),
    );
  };

  const onRootMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.button !== 0) return;
    event.preventDefault();
    activate(linesRef.current.length - 1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!active || event.nativeEvent.isComposing) return;
    const el = event.currentTarget;
    const index = active.line;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = linesRef.current;
    const mod = event.metaKey || event.ctrlKey || event.altKey;

    if (typewriter) {
      const deleting =
        event.key === 'Backspace' ||
        event.key === 'Delete' ||
        (mod && (event.key === 'x' || event.key === 'z'));
      if (deleting) {
        event.preventDefault();
        onBlocked?.();
        return;
      }
      // Typing over a selection would erase it: insert after it instead.
      if (start !== end && event.key.length === 1 && !mod) el.setSelectionRange(end, end);
    }

    switch (event.key) {
      case 'Enter': {
        event.preventDefault();
        if (typewriter || start === end) {
          apply(splitLine(current, index, typewriter ? end : start));
          return;
        }
        const value = current[index] ?? '';
        const trimmed = current.slice();
        trimmed[index] = value.slice(0, start) + value.slice(end);
        apply(splitLine(trimmed, index, start));
        return;
      }
      case 'Backspace': {
        if (start !== 0 || end !== 0) return;
        const edit = mergeWithPrevious(current, index);
        if (!edit) return;
        event.preventDefault();
        apply(edit);
        return;
      }
      case 'Delete': {
        const length = (current[index] ?? '').length;
        if (start !== length || end !== length) return;
        const edit = mergeWithNext(current, index);
        if (!edit) return;
        event.preventDefault();
        apply(edit);
        return;
      }
      case 'ArrowUp':
      case 'ArrowDown': {
        if (mod || event.shiftKey) return;
        const up = event.key === 'ArrowUp';
        const length = (current[index] ?? '').length;
        const atEdge = up ? start === 0 : end === length;
        if (!atEdge && !isSingleRow(el)) return;
        const next = index + (up ? -1 : 1);
        if (next < 0 || next >= current.length) return;
        event.preventDefault();
        activate(next, up ? undefined : 0);
        return;
      }
      case 'Escape':
        event.preventDefault();
        el.blur();
        return;
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!active) return;
    const text = event.clipboardData.getData('text/plain');
    if (!text || (!text.includes('\n') && !typewriter)) return;
    event.preventDefault();
    const el = event.currentTarget;
    const start = typewriter ? el.selectionEnd : el.selectionStart;
    apply(insertText(linesRef.current, active.line, start, el.selectionEnd, text));
  };

  const onLineChange = (value: string) => {
    if (!active) return;
    // A soft line break typed on a mobile keyboard still splits the line.
    if (value.includes('\n')) {
      apply(
        insertText(
          linesRef.current,
          active.line,
          0,
          (linesRef.current[active.line] ?? '').length,
          value,
        ),
      );
      return;
    }
    const next = linesRef.current.slice();
    next[active.line] = value;
    commit(next);
  };

  const onBlur = () => {
    if (switching.current) return;
    flush();
    setActive(null);
  };

  const toggle = (index: number) => {
    const next = linesRef.current.slice();
    next[index] = toggleTask(next[index] ?? '');
    commit(next);
  };

  const empty = lines.length === 1 && lines[0] === '';

  return (
    <div
      className={cx(s.body, typewriter && s.typewriter)}
      role="textbox"
      aria-multiline="true"
      aria-label={props.label}
      tabIndex={active ? -1 : 0}
      onFocus={(e) => {
        if (e.target === e.currentTarget) activate(linesRef.current.length - 1);
      }}
      onMouseDown={onRootMouseDown}
    >
      {lines.map((line, index) => {
        const block = parseLine(line);
        const isActive = active?.line === index;
        return (
          <div
            key={index}
            className={cx(s.line, blockClass(block), isActive && s.lineActive)}
            data-line={index}
            onMouseDown={isActive ? undefined : (e) => onLineMouseDown(index, e)}
          >
            {isActive ? (
              <ActiveLine
                value={line}
                caret={active.caret}
                nonce={active.nonce}
                label={props.label}
                placeholder={empty ? props.placeholder : undefined}
                typewriter={typewriter}
                onBlocked={onBlocked}
                onChange={onLineChange}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                onBlur={onBlur}
                onMounted={() => {
                  switching.current = false;
                }}
              />
            ) : empty ? (
              <span className={s.placeholder} data-content="">
                {props.placeholder}
              </span>
            ) : (
              <RenderedLine
                line={line}
                wiki={wiki}
                taskLabel={props.taskLabel}
                onToggleTask={() => toggle(index)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function isSingleRow(el: HTMLTextAreaElement): boolean {
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
  return el.scrollHeight < lineHeight * 1.6;
}

interface ActiveLineProps {
  value: string;
  caret: number;
  nonce: number;
  label: string;
  placeholder?: string;
  typewriter: boolean;
  onBlocked?: () => void;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
  onMounted: () => void;
}

function ActiveLine(props: ActiveLineProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { caret, nonce, typewriter, onBlocked } = props;
  const onMounted = useRef(props.onMounted);
  onMounted.current = props.onMounted;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(caret, caret);
    onMounted.current();
    // `nonce` re-applies the caret when the same line is asked for again.
  }, [caret, nonce]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);

  // Mobile keyboards delete through `beforeinput` without a Backspace keydown.
  useEffect(() => {
    const el = ref.current;
    if (!el || !typewriter) return;
    const refuse = (event: Event) => {
      const type = (event as InputEvent).inputType ?? '';
      // Autocorrect replacements rewrite an existing word, so they count as deletions.
      if (type.startsWith('delete') || type === 'historyUndo' || type === 'insertReplacementText') {
        event.preventDefault();
        onBlocked?.();
        return;
      }
      // Inserting over a selection (mobile keyboards, autocorrect) would erase it: append instead.
      const target = event.target as HTMLTextAreaElement;
      if (type.startsWith('insert') && target.selectionStart !== target.selectionEnd) {
        target.setSelectionRange(target.selectionEnd, target.selectionEnd);
      }
    };
    const refuseCut = (event: Event) => {
      event.preventDefault();
      onBlocked?.();
    };
    el.addEventListener('beforeinput', refuse);
    el.addEventListener('cut', refuseCut);
    return () => {
      el.removeEventListener('beforeinput', refuse);
      el.removeEventListener('cut', refuseCut);
    };
  }, [typewriter, onBlocked]);

  return (
    <textarea
      ref={ref}
      className={s.source}
      rows={1}
      value={props.value}
      aria-label={props.label}
      placeholder={props.placeholder}
      spellCheck
      onChange={(e) => props.onChange(e.target.value)}
      onKeyDown={props.onKeyDown}
      onPaste={props.onPaste}
      onBlur={props.onBlur}
    />
  );
}
