import { useEffect, useState } from 'react';
import type { Timestamp } from '@pouxis/core';

/** Current time, refreshed every `intervalMs` (default one minute) while mounted. */
export function useNow(intervalMs = 60_000): Timestamp {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
