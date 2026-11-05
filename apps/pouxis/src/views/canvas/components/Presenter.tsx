import { useEffect } from 'react';
import { useT } from '../../../i18n/index.ts';
import { IconChevronLeft, IconChevronRight, IconClose } from '../../../ui/index.ts';
import s from '../Canvas.module.css';

export interface PresenterProps {
  index: number;
  total: number;
  onGo: (index: number) => void;
  onExit: () => void;
}

/** Presentation controls (4.10): the camera glides between waypoints, chrome steps aside. */
export function Presenter({ index, total, onGo, onExit }: PresenterProps) {
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      else if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        onGo(Math.min(total - 1, index + 1));
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) {
        onGo(Math.max(0, index - 1));
      } else if (e.key === 'Home') onGo(0);
      else if (e.key === 'End') onGo(total - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, total, onGo, onExit]);

  return (
    <div className={s.presenter} role="group" aria-label={t('canvas.present.start')}>
      <button
        type="button"
        className={s.barIcon}
        aria-label={t('canvas.present.previous')}
        disabled={index <= 0}
        onClick={() => onGo(index - 1)}
      >
        <IconChevronLeft size={20} />
      </button>
      <span className={s.presenterStep} aria-live="polite">
        {t('canvas.present.step', { current: index + 1, total })}
      </span>
      <span className={s.presenterDots} aria-hidden="true">
        {Array.from({ length: Math.min(total, 12) }, (_, i) => (
          <span key={i} data-on={i === index ? 'true' : 'false'} />
        ))}
      </span>
      <button
        type="button"
        className={s.barIcon}
        aria-label={t('canvas.present.next')}
        disabled={index >= total - 1}
        onClick={() => onGo(index + 1)}
      >
        <IconChevronRight size={20} />
      </button>
      <span className={s.inkDivider} aria-hidden="true" />
      <button
        type="button"
        className={s.barIcon}
        aria-label={t('canvas.present.stop')}
        onClick={onExit}
      >
        <IconClose size={20} />
      </button>
    </div>
  );
}
