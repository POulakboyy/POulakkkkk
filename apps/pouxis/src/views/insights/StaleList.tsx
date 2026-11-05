import { useT } from '../../i18n/index.ts';
import { store } from '../../store/index.ts';
import { Badge, Button, IconArchive, toast } from '../../ui/index.ts';
import { ChartCard } from './ChartCard.tsx';
import type { StaleItem } from './model.ts';
import s from './Insights.module.css';

export interface StaleListProps {
  /** `deadEnds` (5.15) offers to keep a thread alive; `archive` (3.9) also offers to archive. */
  variant: 'deadEnds' | 'archive';
  items: readonly StaleItem[];
  index?: number;
}

/** Touching a record marks it as handled: it leaves both lists without changing its content. */
function keep(item: StaleItem): void {
  store.update(item.kind, item.id, {});
}

function undoable(title: string, undoLabel: string): void {
  toast({ title, action: { label: undoLabel, onClick: () => store.undo() } });
}

/** Dormant threads (5.15) and archive candidates (3.9). Nothing happens without a tap. */
export function StaleList({ variant, items, index }: StaleListProps) {
  const t = useT();
  const ns = variant === 'deadEnds' ? 'insights.deadEnds' : 'insights.archive';

  const onKeep = (item: StaleItem) => {
    keep(item);
    undoable(t(`${ns}.kept`), t('common.undo'));
  };
  const onArchive = (item: StaleItem) => {
    if (item.kind !== 'tasks') return;
    store.update('tasks', item.id, { status: 'archived' });
    undoable(t('insights.archive.archived'), t('common.undo'));
  };

  return (
    <ChartCard title={t(`${ns}.title`)} hint={t(`${ns}.hint`)} index={index}>
      {items.length === 0 ? (
        <p className={s.muted}>{t(`${ns}.empty`)}</p>
      ) : (
        <ul className={s.staleList}>
          {items.map((item) => {
            const title = item.title || t('insights.untitled');
            return (
              <li key={`${item.kind}-${item.id}`} className={s.staleRow}>
                <span className={s.staleText}>
                  <span className={s.staleTitle}>{title}</span>
                  <span className={s.staleMeta}>
                    <Badge>
                      {t(item.kind === 'tasks' ? 'insights.kind.task' : 'insights.kind.note')}
                    </Badge>{' '}
                    {t(`${ns}.idle`, { count: item.idleDays })}
                  </span>
                </span>
                <span className={s.staleActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t(`${ns}.keepLabel`, { title })}
                    onClick={() => onKeep(item)}
                  >
                    {t(`${ns}.keep`)}
                  </Button>
                  {variant === 'archive' && item.kind === 'tasks' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      iconStart={<IconArchive />}
                      aria-label={t('insights.archive.archiveLabel', { title })}
                      onClick={() => onArchive(item)}
                    >
                      {t('insights.archive.archive')}
                    </Button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
