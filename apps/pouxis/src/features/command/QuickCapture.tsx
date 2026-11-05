import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useT } from '../../i18n/index.ts';
import { platform } from '../../platform/index.ts';
import { usePrefs } from '../../store/index.ts';
import { IconArrowUp, IconMic, Kbd, Toaster } from '../../ui/index.ts';
import { Composer } from './Composer.tsx';
import { PreviewRow } from './Preview.tsx';
import { useCapture } from './useCapture.ts';
import { useDictation } from './voice.ts';
import s from './CommandBar.module.css';

/**
 * The window shown by the system-wide shortcut (`index.html#/capture`, desktop): only the
 * composer and its preview. Enter keeps the capture and hides the window; Escape hides it.
 */
export function QuickCapture() {
  const t = useT();
  const { locale } = usePrefs();
  const input = useRef<HTMLTextAreaElement>(null);
  const model = useCapture();
  const { setText } = model;

  useEffect(() => {
    input.current?.focus();
    let unsubscribe: (() => void) | undefined;
    let alive = true;
    void platform
      .onCaptureShown(() => {
        setText('');
        input.current?.focus();
      })
      .then((off) => {
        if (alive) unsubscribe = off;
        else off();
      });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [setText]);

  const dictation = useDictation({
    locale,
    onText: (spoken) => setText(model.text.trim() === '' ? spoken : `${model.text}\n${spoken}`),
  });

  const keep = () => {
    if (model.commit().length > 0) void platform.hideOverlay();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      void platform.hideOverlay();
    } else if (e.key === 'Tab' && model.completion) {
      e.preventDefault();
      model.acceptCompletion();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      keep();
    }
  };

  const items = model.plan.items.filter((i) => i.draft);

  return (
    <main className={s.quick} aria-label={t('command.quick.title')}>
      <div className={s.quickPanel}>
        <Composer
          value={model.text}
          onChange={(v, caret) => model.setText(v, caret)}
          onSelect={model.setCaret}
          onKeyDown={onKeyDown}
          tokens={model.plan.tokens}
          label={t('command.quick.title')}
          placeholder={t('command.placeholder.capture')}
          inputRef={input}
          status={
            <span className={s.hint}>
              {model.completion ? (
                <>
                  <Kbd keys="tab" /> {t('command.suggestion', { value: model.completion.value })}
                </>
              ) : (
                t('command.quick.hint')
              )}
            </span>
          }
          toolbar={
            <>
              {dictation.supported && (
                <button
                  type="button"
                  className={s.toolButton}
                  aria-pressed={dictation.status === 'listening'}
                  aria-label={t(
                    dictation.status === 'listening' ? 'command.voice.stop' : 'command.voice.start',
                  )}
                  onClick={dictation.status === 'listening' ? dictation.stop : dictation.start}
                >
                  <IconMic size={20} />
                </button>
              )}
              <button
                type="button"
                className={s.submit}
                aria-label={t('command.intent.task')}
                disabled={items.length === 0}
                onClick={keep}
              >
                <IconArrowUp size={20} />
              </button>
            </>
          }
        />
        {items.length > 0 && (
          <div className={s.quickPreview} aria-label={t('command.preview.a11y')} role="group">
            {items.slice(0, 3).map((item, i) => (
              <PreviewRow key={i} item={item} />
            ))}
          </div>
        )}
      </div>
      <Toaster />
    </main>
  );
}
