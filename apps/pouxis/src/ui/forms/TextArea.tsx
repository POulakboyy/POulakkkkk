import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from '../utils/cx.ts';
import { mergeRefs } from '../utils/refs.ts';
import { Field } from './Field.tsx';
import s from './Field.module.css';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  optionalText?: string;
  /** Grow with the content between `rows` and `maxRows`. Default `true`. */
  autoGrow?: boolean;
  /** Upper bound for auto-grow before scrolling. Default 12. */
  maxRows?: number;
  /** Show "12 / 280" when `maxLength` is set. Default `true` with `maxLength`. */
  showCount?: boolean;
  wrapperClassName?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

/** Multi-line text input that grows with its content. */
export function TextArea({
  label,
  hideLabel,
  hint,
  error,
  optionalText,
  autoGrow = true,
  rows = 3,
  maxRows = 12,
  showCount,
  maxLength,
  required,
  id,
  className,
  wrapperClassName,
  value,
  defaultValue,
  onInput,
  ref,
  ...rest
}: TextAreaProps) {
  const inner = useRef<HTMLTextAreaElement>(null);
  const [typed, setTyped] = useState(String(defaultValue ?? '').length);
  const resize = useCallback(() => {
    const el = inner.current;
    if (!el || !autoGrow) return;
    const cs = getComputedStyle(el);
    const px = (v: string) => Number.parseFloat(v) || 0;
    const line = px(cs.lineHeight) || 24;
    const border = px(cs.borderTopWidth) + px(cs.borderBottomWidth);
    const max = line * maxRows + px(cs.paddingTop) + px(cs.paddingBottom) + border;
    el.style.height = 'auto';
    const content = el.scrollHeight + border;
    el.style.height = `${Math.min(content, max)}px`;
    el.style.overflowY = content > max ? 'auto' : 'hidden';
  }, [autoGrow, maxRows]);

  useLayoutEffect(resize, [resize, value]);

  const length = value !== undefined ? String(value).length : typed;
  const counter =
    maxLength !== undefined && (showCount ?? true) ? (
      <span className={s.counter} aria-hidden="true">
        {length} / {maxLength}
      </span>
    ) : undefined;

  return (
    <Field
      label={label}
      hideLabel={hideLabel ?? false}
      hint={hint}
      error={error}
      required={required ?? false}
      id={id}
      className={wrapperClassName}
      labelAside={counter}
      {...(optionalText ? { optionalText } : {})}
    >
      {(aria) => (
        <span className={cx(s.control, s.multiline, !!error && s.invalid)}>
          <textarea
            ref={mergeRefs(inner, ref)}
            rows={rows}
            maxLength={maxLength}
            required={required}
            value={value}
            defaultValue={defaultValue}
            className={cx(s.input, s.textarea, className)}
            onInput={(e) => {
              onInput?.(e);
              setTyped(e.currentTarget.value.length);
              resize();
            }}
            {...aria}
            {...rest}
          />
        </span>
      )}
    </Field>
  );
}
