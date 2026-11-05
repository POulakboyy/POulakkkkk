/** Divergent constraints generator (5.4): one unexpected rule at a time, never twice in a row. */
import { useRef, useState } from 'react';
import { ideation } from '@pouxis/core';
import { useT } from '../../../i18n/index.ts';
import { usePrefs } from '../../../store/index.ts';
import {
  Button,
  IconButton,
  IconCopy,
  IconRepeat,
  IconSparkle,
  Pill,
  PillGroup,
  toast,
} from '../../../ui/index.ts';
import { copyText } from './clipboard.ts';
import { ToolHeader } from './ToolHeader.tsx';
import s from './Studio.module.css';

type Category = ideation.ConstraintCategory | 'all';

export function Constraints() {
  const t = useT();
  const { locale } = usePrefs();
  const rng = useRef(ideation.mulberry32(Date.now() >>> 0));
  const [category, setCategory] = useState<Category>('all');
  const [drawn, setDrawn] = useState<string[]>([]);
  const [current, setCurrent] = useState<ideation.Constraint | null>(null);
  const [exhausted, setExhausted] = useState(false);

  const draw = (cat: Category = category, exclude: readonly string[] = drawn) => {
    const options = { rng: rng.current, ...(cat === 'all' ? {} : { category: cat }) };
    let next = ideation.drawConstraint({ ...options, exclude });
    let history = [...exclude];
    setExhausted(next === null);
    if (next === null) {
      history = [];
      next = ideation.drawConstraint(options);
    }
    if (!next) return;
    setCurrent(next);
    setDrawn([...history, next.id]);
  };

  const copy = async () => {
    if (!current) return;
    if (await copyText(current.text[locale])) toast({ title: t('ideas.constraints.copied') });
  };

  const recent = drawn
    .slice(0, -1)
    .slice(-3)
    .reverse()
    .map((id) => ideation.getConstraint(id))
    .filter((c): c is ideation.Constraint => c !== undefined);

  return (
    <section className={s.tool} aria-labelledby="constraints-title">
      <ToolHeader
        id="constraints-title"
        title={t('ideas.constraints.title')}
        hint={t('ideas.constraints.hint')}
      />
      <PillGroup label={t('ideas.constraints.category')} wrap className={s.pills}>
        {[
          { id: 'all' as const, label: t('ideas.constraints.all') },
          ...ideation.CONSTRAINT_CATEGORIES.map((c) => ({ id: c.id, label: c.label[locale] })),
        ].map((c) => (
          <Pill
            key={c.id}
            size="sm"
            selected={category === c.id}
            onSelectedChange={() => {
              setCategory(c.id);
              if (current) draw(c.id);
            }}
          >
            {c.label}
          </Pill>
        ))}
      </PillGroup>

      {current ? (
        <figure className={s.constraint} aria-live="polite">
          <blockquote key={current.id} className={s.constraintText}>
            {current.text[locale]}
          </blockquote>
          <figcaption className={s.constraintMeta}>
            {ideation.CONSTRAINT_CATEGORIES.find((c) => c.id === current.category)?.label[locale]}
            <IconButton
              label={t('ideas.constraints.copy')}
              icon={<IconCopy />}
              variant="ghost"
              size="sm"
              onClick={() => void copy()}
            />
          </figcaption>
        </figure>
      ) : null}
      {exhausted && <p className={s.muted}>{t('ideas.constraints.exhausted')}</p>}

      <div className={s.row}>
        <Button
          variant={current ? 'secondary' : 'primary'}
          iconStart={current ? <IconRepeat /> : <IconSparkle />}
          onClick={() => draw()}
        >
          {current ? t('ideas.constraints.again') : t('ideas.constraints.action')}
        </Button>
      </div>

      {recent.length > 0 && (
        <div className={s.drawn}>
          <p className={s.drawnTitle}>{t('ideas.constraints.drawn')}</p>
          <ul className={s.drawnList}>
            {recent.map((c) => (
              <li key={c.id}>{c.text[locale]}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
