import { useId, useState, type CSSProperties, type FormEvent } from 'react';
import { DAY, type Id, type JournalEntry } from '@pouxis/core';
import { useFormat, useT } from '../../../i18n/index.ts';
import { store, useCollection, usePrefs } from '../../../store/index.ts';
import {
  Button,
  Card,
  IconPlus,
  IconRepeat,
  IconStar,
  Pill,
  PillGroup,
  TextField,
  cx,
  toast,
} from '../../../ui/index.ts';
import shared from '../shared/panel.module.css';
import { useNow } from '../shared/useNow.ts';
import {
  JAR_CAPACITY,
  memoryAt,
  pastWins,
  pebbleColor,
  unjarredCompletions,
  winTags,
  winsThisWeek,
} from './wins.ts';
import styles from './WinsJar.module.css';

export function WinsJar() {
  const t = useT();
  const prefs = usePrefs();
  const now = useNow();
  const headingId = useId();
  const journal = useCollection('journal');
  const tasks = useCollection('tasks');
  const [text, setText] = useState('');

  const week = winsThisWeek(journal, now, prefs.timeZone);
  const completions = unjarredCompletions(tasks, journal, now, prefs.timeZone);

  const addWin = (value: string, taskId?: Id) => {
    const entry = store.create('journal', { kind: 'win', text: value, tags: winTags(taskId) });
    toast({
      title: t('lab.wins.added'),
      tone: 'success',
      action: { label: t('common.undo'), onClick: () => store.remove('journal', entry.id) },
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = text.replace(/\s+/g, ' ').trim();
    if (!value) return;
    addWin(value);
    setText('');
  };

  return (
    <section className={shared.panel} aria-labelledby={headingId}>
      <div className={styles.top}>
        <Jar wins={week} />
        <header className={shared.header}>
          <h3 className={shared.heading} id={headingId}>
            {t('lab.wins.heading')}
          </h3>
          <p className={cx(shared.lead, shared.tabular)} aria-live="polite">
            {t('lab.wins.count', { count: week.length })}
          </p>
        </header>
      </div>

      <form className={styles.form} onSubmit={submit}>
        <TextField
          label={t('lab.wins.input')}
          hint={t('lab.wins.inputHint')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={140}
          wrapperClassName={styles.input}
        />
        <Button type="submit" variant="primary" iconStart={<IconPlus size={16} />}>
          {t('lab.wins.add')}
        </Button>
      </form>

      {completions.length > 0 ? (
        <div className={shared.section}>
          <p className={shared.label}>{t('lab.wins.fromTasks')}</p>
          <p className={shared.muted}>{t('lab.wins.fromTasksHint')}</p>
          <PillGroup label={t('lab.wins.fromTasks')} wrap>
            {completions.map((task) => (
              <Pill
                key={task.id}
                size="sm"
                icon={task.icon ? <span>{task.icon}</span> : <IconPlus size={14} />}
                onClick={() => addWin(task.title, task.id)}
              >
                {task.title}
              </Pill>
            ))}
          </PillGroup>
        </div>
      ) : null}

      {week.length > 0 ? <WeekList wins={week} /> : null}
      <Memory journal={journal} />
    </section>
  );
}

function Jar({ wins }: { wins: readonly JournalEntry[] }) {
  const t = useT();
  const shown = wins.slice(0, JAR_CAPACITY);
  const overflow = wins.length - shown.length;
  return (
    <div className={styles.jar} role="img" aria-label={t('lab.wins.jar', { count: wins.length })}>
      <span className={styles.lid} aria-hidden="true" />
      <span className={styles.glass} aria-hidden="true">
        {/* Oldest at the bottom: pebbles settle in the order they were added. */}
        {[...shown].reverse().map((win, i) => (
          <span
            key={win.id}
            className={cx(styles.pebble, 'px-pop')}
            style={{ '--c': `var(--cat-${pebbleColor(win.id)})`, '--i': i } as CSSProperties}
          />
        ))}
      </span>
      {overflow > 0 ? (
        <span className={cx(styles.more, shared.tabular)} aria-hidden="true">
          {t('lab.wins.more', { count: overflow })}
        </span>
      ) : null}
    </div>
  );
}

function WeekList({ wins }: { wins: readonly JournalEntry[] }) {
  const t = useT();
  const format = useFormat();
  return (
    <div className={shared.section}>
      <p className={shared.label}>{t('lab.wins.list')}</p>
      <ul className={shared.list}>
        {wins.map((win) => (
          <li key={win.id} className={styles.win}>
            <span
              className={styles.dot}
              style={{ '--c': `var(--cat-${pebbleColor(win.id)})` } as CSSProperties}
              aria-hidden="true"
            />
            <span className={styles.winText}>{win.text}</span>
            <span className={cx(shared.muted, shared.tabular)}>
              {format.date(win.createdAt, 'weekdayShort')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Memory({ journal }: { journal: readonly JournalEntry[] }) {
  const t = useT();
  const format = useFormat();
  const prefs = usePrefs();
  const now = useNow();
  const pool = pastWins(journal, now, prefs.timeZone);
  // Start on a different memory each day, then cycle on demand.
  const [turn, setTurn] = useState(() => Math.floor(now / DAY));
  const memory = memoryAt(pool, turn);
  return (
    <Card variant="outlined" padding="lg" as="section" aria-label={t('lab.wins.memory')}>
      <div className={styles.memory}>
        <p className={cx(shared.label, styles.memoryLabel)}>
          <IconStar size={14} />
          {t('lab.wins.memory')}
        </p>
        {memory ? (
          <>
            <p key={memory.id} className={cx(styles.memoryText, 'px-fade-in')}>
              {memory.text}
            </p>
            <p className={cx(shared.muted, shared.tabular)}>
              {format.date(memory.createdAt, 'medium')}
            </p>
            {pool.length > 1 ? (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  iconStart={<IconRepeat size={14} />}
                  onClick={() => setTurn((n) => n + 1)}
                >
                  {t('lab.wins.another')}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <p className={shared.muted}>{t('lab.wins.memoryNone')}</p>
        )}
      </div>
    </Card>
  );
}
