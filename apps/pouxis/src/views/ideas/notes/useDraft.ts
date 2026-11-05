import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Local copy of a stored text field: edits show instantly (no caret jumps from async store
 * notifications) and are saved after a pause, on blur or on unmount. External changes win when
 * nothing is pending.
 */
export function useDraft(
  value: string,
  save: (value: string) => void,
  delay = 400,
): [string, (next: string) => void, () => void] {
  const [draft, setDraft] = useState(value);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current === null) return;
    const next = pending.current;
    pending.current = null;
    saveRef.current(next);
  }, []);

  const change = useCallback(
    (next: string) => {
      setDraft(next);
      pending.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [flush, delay],
  );

  useEffect(() => {
    if (pending.current === null) setDraft(value);
  }, [value]);

  useEffect(() => flush, [flush]);

  return [draft, change, flush];
}
