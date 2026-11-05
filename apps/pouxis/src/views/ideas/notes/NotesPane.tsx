import { useDeferredValue, useMemo, useState } from 'react';
import { useFormat, useT } from '../../../i18n/index.ts';
import { store, useCollection } from '../../../store/index.ts';
import {
  Button,
  cx,
  EmptyState,
  IconIdeas,
  IconPlus,
  IconSearch,
  TextField,
} from '../../../ui/index.ts';
import { excerpt, linkableNotes, visibleNotes } from '../lib/notes.ts';
import { NoteEditor } from './NoteEditor.tsx';
import s from './Notes.module.css';

export interface NotesPaneProps {
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
  onBrainDump: () => void;
}

export function NotesPane({ selectedId, onSelect, onBrainDump }: NotesPaneProps) {
  const t = useT();
  const format = useFormat();
  const all = useCollection('notes');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [typewriter, setTypewriter] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const linkable = useMemo(() => linkableNotes(all), [all]);
  const list = useMemo(() => visibleNotes(all, deferredQuery), [all, deferredQuery]);
  const selected = selectedId ? linkable.find((n) => n.id === selectedId) : undefined;

  const create = () => {
    const note = store.create('notes', { title: '', body: '', tags: [], links: [] });
    setCreatedId(note.id);
    onSelect(note.id);
  };

  if (visibleNotes(all).length === 0 && !selected) {
    return (
      <EmptyState
        icon={<IconIdeas size={32} />}
        title={t('ideas.empty.title')}
        description={t('ideas.empty.body')}
        action={
          <Button variant="primary" iconStart={<IconPlus />} onClick={create}>
            {t('ideas.empty.action')}
          </Button>
        }
        secondaryAction={
          <Button variant="ghost" onClick={onBrainDump}>
            {t('ideas.empty.secondary')}
          </Button>
        }
      />
    );
  }

  return (
    <div className={cx(s.pane, selected && s.hasNote)}>
      <aside className={s.sidebar} aria-label={t('ideas.notes.list')}>
        <div className={s.sidebarHead}>
          <TextField
            label={t('ideas.notes.search')}
            hideLabel
            type="search"
            placeholder={t('ideas.notes.search')}
            iconStart={<IconSearch size={16} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            wrapperClassName={s.search}
          />
          <Button variant="secondary" iconStart={<IconPlus />} onClick={create}>
            {t('ideas.notes.new')}
          </Button>
        </div>
        {list.length === 0 ? (
          <p className={s.noResults} role="status">
            {t('ideas.notes.noResults', { query: deferredQuery.trim() })}
          </p>
        ) : (
          <ul className={s.list}>
            {list.map((note) => {
              const preview = excerpt(note.body);
              return (
                <li key={note.id}>
                  <button
                    type="button"
                    className={s.row}
                    aria-current={note.id === selectedId ? 'true' : undefined}
                    onClick={() => onSelect(note.id)}
                  >
                    <span className={s.rowTitle}>
                      {note.title.trim() || t('ideas.notes.untitled')}
                    </span>
                    {preview && <span className={s.rowExcerpt}>{preview}</span>}
                    <span className={s.rowMeta}>{format.relativeTime(note.updatedAt)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className={s.main}>
        {selected ? (
          <NoteEditor
            key={selected.id}
            note={selected}
            notes={linkable}
            typewriter={typewriter}
            onTypewriterChange={setTypewriter}
            onOpen={onSelect}
            onBack={() => onSelect(undefined)}
            onDeleted={() => onSelect(undefined)}
            autoFocusTitle={selected.id === createdId}
          />
        ) : (
          <p className={s.pick}>{t('ideas.notes.pick')}</p>
        )}
      </section>
    </div>
  );
}
