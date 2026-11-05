/**
 * Sandbox (5.8): a throwaway draft stored as a `sandbox` note — excluded from search, links and
 * insights, and purged at the end of the session (see `lib/sandbox.ts`).
 */
import { useId } from 'react';
import { useT } from '../../../i18n/index.ts';
import { store, useCollection } from '../../../store/index.ts';
import { Badge, Button, IconClock, IconTrash, toast } from '../../../ui/index.ts';
import { purgeSandbox, sandboxNotes } from '../lib/sandbox.ts';
import { titleFromBody } from '../lib/notes.ts';
import { useDraft } from '../notes/useDraft.ts';
import s from './Sandbox.module.css';

export function SandboxPane({ onKept }: { onKept: (noteId: string) => void }) {
  const t = useT();
  const id = useId();
  const notes = useCollection('notes');
  const draftNote = sandboxNotes(notes)[0];

  const save = (body: string) => {
    const current = sandboxNotes(store.all('notes'))[0];
    if (current) store.update('notes', current.id, { body });
    else if (body.trim())
      store.create('notes', { title: '', body, tags: [], links: [], sandbox: true });
  };
  const [text, setText, flush] = useDraft(draftNote?.body ?? '', save);

  const keep = () => {
    flush();
    const current = sandboxNotes(store.all('notes'))[0];
    if (!current?.body.trim()) return;
    const kept = store.batch(() => {
      const note = store.create('notes', {
        title: titleFromBody(current.body),
        body: current.body,
        tags: [],
        links: [],
      });
      purgeSandbox(store);
      return note;
    });
    setText('');
    flush();
    toast({
      title: t('ideas.sandbox.kept'),
      tone: 'success',
      action: { label: t('common.actions.open'), onClick: () => onKept(kept.id) },
    });
  };

  const clear = () => {
    flush();
    // Purge first so the undo step brings the draft back with its text.
    purgeSandbox(store);
    setText('');
    flush();
    toast({
      title: t('ideas.sandbox.cleared'),
      action: { label: t('common.undo'), onClick: () => store.undo() },
    });
  };

  const hasText = text.trim().length > 0;

  return (
    <section className={s.sandbox} aria-labelledby={`${id}-title`}>
      <header className={s.header}>
        <div>
          <h2 id={`${id}-title`} className={s.title}>
            {t('ideas.sandbox.title')}
          </h2>
          <p className={s.hint}>{t('ideas.sandbox.hint')}</p>
        </div>
        <Badge icon={<IconClock size={12} />}>{t('ideas.sandbox.endsWith')}</Badge>
      </header>
      <div className={s.paper}>
        <textarea
          className={s.field}
          aria-label={t('ideas.sandbox.label')}
          placeholder={t('ideas.sandbox.placeholder')}
          value={text}
          spellCheck
          onChange={(e) => setText(e.target.value)}
          onBlur={flush}
        />
      </div>
      <div className={s.actions}>
        <Button variant="ghost" iconStart={<IconTrash />} disabled={!hasText} onClick={clear}>
          {t('ideas.sandbox.clear')}
        </Button>
        <Button variant="primary" disabled={!hasText} onClick={keep}>
          {t('ideas.sandbox.keep')}
        </Button>
      </div>
    </section>
  );
}
