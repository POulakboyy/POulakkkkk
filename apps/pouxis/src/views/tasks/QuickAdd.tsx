/**
 * Capture line: natural language in, task out (« Appeler Léa demain 15h #perso »). What the
 * parser understood is previewed live under the field, before anything is saved.
 */
import { useState, type FormEvent, type Ref } from 'react';
import { nlp } from '@pouxis/core';
import type { NewRecord } from '../../store/index.ts';
import { Button, IconArrowUp, IconPlus, TextField } from '../../ui/index.ts';
import { useTasks } from './context.ts';
import { taskFromCapture } from './model.ts';
import s from './Tasks.module.css';

export function QuickAdd({
  onCreate,
  inputRef,
}: {
  onCreate: (record: NewRecord<'tasks'>) => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const { t, fmt, now, prefs } = useTasks();
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  const ctx = { now, timeZone: prefs.timeZone, locale: prefs.locale };
  const preview = text.trim() ? nlp.parse(text.trim(), ctx) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const record = taskFromCapture(text, ctx);
    if (!record) return setError(true);
    onCreate(record);
    setText('');
    setError(false);
  };

  const chips: string[] = [];
  if (preview) {
    if (preview.start !== undefined) {
      const day = fmt.relativeDay(preview.start, now);
      chips.push(preview.allDay ? day : `${day} · ${fmt.time(preview.start)}`);
    }
    if (preview.deadline !== undefined) {
      chips.push(t('tasks.detail.due', { when: fmt.relativeDay(preview.deadline, now) }));
    }
    const estimate = preview.estimateMin ?? preview.durationMin;
    if (estimate !== undefined) chips.push(fmt.duration(estimate));
    if (preview.priority === 3) chips.push(t('common.priority.high'));
    if (preview.recurrence) chips.push(preview.recurrence);
    for (const tag of preview.tags) chips.push(`#${tag}`);
  }

  return (
    <form className={s.quickAdd} onSubmit={submit} aria-label={t('tasks.add.label')}>
      <TextField
        ref={inputRef}
        label={t('tasks.add.label')}
        hideLabel
        size="lg"
        value={text}
        placeholder={t('tasks.add.placeholder')}
        onChange={(e) => {
          setText(e.target.value);
          setError(false);
        }}
        iconStart={<IconPlus />}
        enterKeyHint="done"
        autoComplete="off"
        wrapperClassName={s.quickField}
        className={s.quickInput}
        {...(error ? { error: t('tasks.add.invalid') } : {})}
        trailing={
          <Button
            type="submit"
            size="sm"
            disabled={!text.trim()}
            iconStart={<IconArrowUp />}
            className={s.quickSubmit}
          >
            {t('common.actions.add')}
          </Button>
        }
      />
      <p className={s.quickHint} aria-live="polite">
        {chips.length > 0 ? (
          <span className={s.parsed}>
            {chips.map((c) => (
              <span key={c} className={s.parsedChip}>
                {c}
              </span>
            ))}
          </span>
        ) : (
          t('tasks.add.hint')
        )}
      </p>
    </form>
  );
}
