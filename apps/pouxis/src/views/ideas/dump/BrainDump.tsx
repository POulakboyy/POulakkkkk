/**
 * Full-screen plain textarea (5.14). Deliberately bare — no editor, no async work — so it is
 * interactive on the first frame. Closing sends one task per line to the inbox.
 */
import { useRef, useState } from 'react';
import { useT } from '../../../i18n/index.ts';
import { store } from '../../../store/index.ts';
import { Button, IconInbox, Portal, useFocusTrap, useScrollLock } from '../../../ui/index.ts';
import { splitIdeas } from '../lib/notes.ts';
import { brainDump, flushToInbox, useBrainDumpOpen } from './brainDump.ts';
import s from './BrainDump.module.css';

/** Mount once; renders the brain dump whenever `brainDump.open()` is called. */
export function BrainDumpHost() {
  const open = useBrainDumpOpen();
  return open ? <BrainDump onClose={() => brainDump.close()} /> : null;
}

export function BrainDump({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [text, setText] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  useFocusTrap(root, true, { initialFocus: field });
  useScrollLock(true);

  const count = splitIdeas(text).length;
  const close = () => {
    flushToInbox(store, text);
    onClose();
  };

  return (
    <Portal>
      <div
        ref={root}
        className={s.root}
        role="dialog"
        aria-modal="true"
        aria-labelledby="brain-dump-title"
        aria-describedby="brain-dump-hint"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
        }}
      >
        <header className={s.header}>
          <h2 id="brain-dump-title" className={s.title}>
            {t('ideas.brainDump.title')}
          </h2>
          <span className={s.count} aria-live="polite">
            {t('ideas.brainDump.count', { count })}
          </span>
        </header>
        <textarea
          ref={field}
          className={s.field}
          value={text}
          autoFocus
          spellCheck
          aria-labelledby="brain-dump-title"
          placeholder={t('ideas.brainDump.placeholder')}
          onChange={(e) => setText(e.target.value)}
        />
        <footer className={s.footer}>
          <p id="brain-dump-hint" className={s.hint}>
            {t('ideas.brainDump.hint')}
          </p>
          <Button variant="primary" size="lg" iconStart={<IconInbox />} onClick={close}>
            {count > 0 ? t('ideas.brainDump.close') : t('common.close')}
          </Button>
        </footer>
      </div>
    </Portal>
  );
}
