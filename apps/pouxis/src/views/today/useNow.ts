import { useEffect, useState } from 'react';
import type { Timestamp } from '@pouxis/core';

/** Current time, refreshed every `stepMs` and when the app becomes visible again. */
export function useNow(stepMs = 30_000): Timestamp {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const id = window.setInterval(update, stepMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [stepMs]);
  return now;
}
