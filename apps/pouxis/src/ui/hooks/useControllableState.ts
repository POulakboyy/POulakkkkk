import { useCallback, useRef, useState } from 'react';

/**
 * State that can be controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 * `onChange` fires in both modes.
 */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const currentRef = useRef(current);
  currentRef.current = current;

  const set = useCallback(
    (next: T) => {
      if (Object.is(next, currentRef.current)) return;
      if (!controlled) setInner(next);
      onChangeRef.current?.(next);
    },
    [controlled],
  );
  return [current, set];
}
