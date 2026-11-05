/** Dead-end detector (5.15): notes started, then never edited again (`insights.deadEnds`). */
import { useMemo } from 'react';
import { insights, type Note } from '@pouxis/core';
import { useT } from '../../../i18n/index.ts';
import { store } from '../../../store/index.ts';
import { Button, IconArchive, toast } from '../../../ui/index.ts';
import { ARCHIVED_TAG, excerpt, visibleNotes } from '../lib/notes.ts';
import { ToolHeader } from './ToolHeader.tsx';
import s from './Studio.module.css';

/** Shown at once; the list is a nudge, not a backlog. */
const MAX_SHOWN = 6;

export interface DeadEndsProps {
  notes: readonly Note[];
  onOpen: (id: string) => void;
  now?: number;
}

export function DeadEnds({ notes, onOpen, now }: DeadEndsProps) {
  const t = useT();
  const stale = useMemo(
    () => insights.deadEnds(visibleNotes(notes), now ?? Date.now()).slice(0, MAX_SHOWN),
    [notes, now],
  );

  const archive = (note: Note) => {
    store.update('notes', note.id, { tags: [...note.tags, ARCHIVED_TAG] });
    toast({
      title: t('ideas.deadEnds.archived'),
      action: { label: t('common.undo'), onClick: () => store.undo() },
    });
  };

  return (
    <section className={s.tool} aria-labelledby="dead-ends-title">
      <ToolHeader
        id="dead-ends-title"
        title={t('ideas.deadEnds.title')}
        hint={t('ideas.deadEnds.hint')}
      />
      {stale.length === 0 ? (
        <p className={s.muted}>{t('ideas.deadEnds.empty')}</p>
      ) : (
        <ul className={s.deadList}>
          {stale.map(({ record, idleDays }) => (
            <li key={record.id} className={s.deadItem}>
              <div className={s.deadText}>
                <p className={s.deadTitle}>{record.title.trim() || t('ideas.notes.untitled')}</p>
                {excerpt(record.body) && (
                  <p className={s.deadExcerpt}>{excerpt(record.body, 80)}</p>
                )}
                <p className={s.deadMeta}>{t('ideas.deadEnds.since', { count: idleDays })}</p>
              </div>
              <div className={s.deadActions}>
                <Button size="sm" variant="secondary" onClick={() => onOpen(record.id)}>
                  {t('ideas.deadEnds.revisit')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  iconStart={<IconArchive />}
                  onClick={() => archive(record)}
                >
                  {t('ideas.deadEnds.archive')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
