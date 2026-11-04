import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { useT } from '../../i18n/index.ts';
import { Button, Card } from '../../ui/index.ts';
import s from './Insights.module.css';

export interface ChartCardProps {
  title: string;
  hint?: ReactNode;
  /** Trailing header action (overrides the table toggle slot). */
  action?: ReactNode;
  /** When given, a "show as table" toggle is offered and `table` renders instead of the chart. */
  table?: () => ReactNode;
  /** Position in the page, for the staggered entrance. */
  index?: number;
  className?: string;
  children: ReactNode;
}

/** Card with a serif title, a one-line hint and an accessible chart ⇄ table toggle. */
export function ChartCard({
  title,
  hint,
  action,
  table,
  index = 0,
  className,
  children,
}: ChartCardProps) {
  const t = useT();
  const id = useId();
  const [asTable, setAsTable] = useState(false);
  const style = { '--i': index } as CSSProperties;

  return (
    <Card
      as="section"
      variant="elevated"
      padding="lg"
      aria-labelledby={id}
      className={[s.card, s.reveal, className].filter(Boolean).join(' ')}
      style={style}
    >
      <header className={s.cardHead}>
        <div className={s.cardTitles}>
          <h2 id={id} className={s.cardTitle}>
            {title}
          </h2>
          {hint ? <p className={s.cardHint}>{hint}</p> : null}
        </div>
        {action ??
          (table ? (
            <Button
              variant="ghost"
              size="sm"
              className={s.cardAction}
              aria-pressed={asTable}
              onClick={() => setAsTable((v) => !v)}
            >
              {t('insights.showTable')}
            </Button>
          ) : null)}
      </header>
      {asTable && table ? table() : children}
    </Card>
  );
}
