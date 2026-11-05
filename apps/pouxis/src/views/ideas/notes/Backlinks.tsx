/** Backlinks panel (3.14): notes that mention this one, computed by `search.backlinks`. */
import { useMemo } from 'react';
import { search, type Note } from '@pouxis/core';
import { useT } from '../../../i18n/index.ts';
import { IconLink } from '../../../ui/index.ts';
import s from './Notes.module.css';

export interface BacklinksProps {
  note: Note;
  notes: readonly Note[];
  onOpen: (id: string) => void;
}

export function Backlinks({ note, notes, onOpen }: BacklinksProps) {
  const t = useT();
  const links = useMemo(() => search.backlinks(notes, note.id), [notes, note.id]);
  const title = note.title.trim() || t('ideas.notes.untitled');

  return (
    <section className={s.backlinks} aria-labelledby={`backlinks-${note.id}`}>
      <h2 id={`backlinks-${note.id}`} className={s.backlinksTitle}>
        <IconLink size={16} />
        {t('ideas.notes.backlinks')}
        {links.length > 0 && <span className={s.count}>{links.length}</span>}
      </h2>
      {links.length === 0 ? (
        <p className={s.backlinksEmpty}>{t('ideas.notes.noBacklinks', { title })}</p>
      ) : (
        <ul className={s.backlinkList}>
          {links.map((link) => (
            <li key={link.id}>
              <button type="button" className={s.backlink} onClick={() => onOpen(link.id)}>
                <span className={s.backlinkTitle}>
                  {link.record.title.trim() || t('ideas.notes.untitled')}
                </span>
                {link.snippet && <span className={s.backlinkSnippet}>{link.snippet}</span>}
                {link.mentions > 1 && (
                  <span className={s.backlinkMeta}>
                    {t('ideas.notes.mentions', { count: link.mentions })}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
