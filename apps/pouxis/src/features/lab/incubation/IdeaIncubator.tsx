import { useId } from 'react';
import { addDays, startOfDay, type JournalEntry, type Note } from '@pouxis/core';
import { routeHash } from '../../../app/router.ts';
import { useFormat, useT } from '../../../i18n/index.ts';
import { store, useCollection, usePrefs } from '../../../store/index.ts';
import { Button, Card, IconArrowRight, Pill, PillGroup, cx, toast } from '../../../ui/index.ts';
import shared from '../shared/panel.module.css';
import { useNow } from '../shared/useNow.ts';
import {
  INTERVALS_DAYS,
  excerpt,
  incubating,
  incubationCandidates,
  incubationTags,
  nextStage,
  splitDue,
  type Incubating,
} from './incubation.ts';
import styles from './IdeaIncubator.module.css';

export function IdeaIncubator() {
  const t = useT();
  const format = useFormat();
  const prefs = usePrefs();
  const now = useNow();
  const headingId = useId();
  const journal = useCollection('journal');
  const notes = useCollection('notes');
  const parked = incubating(journal, notes, prefs.timeZone);
  const { due, waiting } = splitDue(parked, now);
  const candidates = incubationCandidates(notes, parked);

  const undoable = (title: string, undo: () => void) =>
    toast({ title, tone: 'success', action: { label: t('common.undo'), onClick: undo } });

  const park = (note: Note) => {
    const entry = store.create('journal', {
      kind: 'dump',
      text: note.title,
      tags: incubationTags(note.id, 0, now, prefs.timeZone),
    });
    const back = addDays(startOfDay(now, prefs.timeZone), INTERVALS_DAYS[0], prefs.timeZone);
    undoable(t('lab.incubation.parked', { when: format.relativeDay(back, now) }), () =>
      store.remove('journal', entry.id),
    );
  };

  const later = ({ entry, note, stage }: Incubating) => {
    const before = entry.tags;
    store.update('journal', entry.id, {
      tags: incubationTags(note.id, nextStage(stage), now, prefs.timeZone),
    });
    undoable(t('lab.incubation.postponed'), () =>
      store.update('journal', entry.id, { tags: before }),
    );
  };

  const restore = (entry: JournalEntry) =>
    store.create('journal', { kind: entry.kind, text: entry.text, tags: entry.tags });

  const develop = ({ entry, note }: Incubating) => {
    store.remove('journal', entry.id);
    const task = store.create('tasks', {
      title: t('lab.incubation.taskTitle', { title: note.title }),
      status: 'todo',
      priority: 0,
      tags: [],
      dependsOn: [],
      floatingDay: startOfDay(now, prefs.timeZone),
      mode: 'create',
      postponedCount: 0,
      timeLogs: [],
    });
    undoable(t('lab.incubation.developed'), () => {
      store.remove('tasks', task.id);
      restore(entry);
    });
  };

  const letGo = ({ entry }: Incubating) => {
    store.remove('journal', entry.id);
    undoable(t('lab.incubation.released'), () => restore(entry));
  };

  return (
    <section className={shared.panel} aria-labelledby={headingId}>
      <header className={shared.header}>
        <h3 className={shared.heading} id={headingId}>
          {t('lab.incubation.heading')}
        </h3>
        <p className={shared.lead}>{t('lab.incubation.lead')}</p>
      </header>

      {due.length > 0 ? (
        <div className={shared.section}>
          <p className={shared.label}>{t('lab.incubation.due', { count: due.length })}</p>
          <ul className={shared.list}>
            {due.map((item) => (
              <DueIdea
                key={item.entry.id}
                item={item}
                onLater={() => later(item)}
                onDevelop={() => develop(item)}
                onLetGo={() => letGo(item)}
              />
            ))}
          </ul>
          <p className={shared.muted}>{t('lab.incubation.tip')}</p>
        </div>
      ) : null}

      {waiting.length > 0 ? (
        <div className={shared.section}>
          <p className={shared.label}>{t('lab.incubation.waiting')}</p>
          <ul className={shared.list}>
            {waiting.map(({ entry, note, dueAt }) => (
              <li key={entry.id} className={styles.waiting}>
                <span className={styles.title}>{note.title}</span>
                <span className={cx(shared.muted, shared.tabular)}>
                  {t('lab.incubation.back', { when: format.relativeDay(dueAt, now) })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={shared.section}>
        <p className={shared.label}>{t('lab.incubation.park')}</p>
        {candidates.length > 0 ? (
          <>
            <p className={shared.muted}>{t('lab.incubation.parkHint')}</p>
            <PillGroup label={t('lab.incubation.park')} wrap>
              {candidates.map((note) => (
                <Pill key={note.id} size="sm" onClick={() => park(note)}>
                  {note.title}
                </Pill>
              ))}
            </PillGroup>
          </>
        ) : (
          <p className={shared.muted}>{t('lab.incubation.noCandidates')}</p>
        )}
      </div>
    </section>
  );
}

interface DueIdeaProps {
  item: Incubating;
  onLater: () => void;
  onDevelop: () => void;
  onLetGo: () => void;
}

function DueIdea({ item, onLater, onDevelop, onLetGo }: DueIdeaProps) {
  const t = useT();
  const format = useFormat();
  const now = useNow();
  const { note, entry } = item;
  const summary = excerpt(note);
  return (
    <li>
      <Card variant="outlined" padding="md" className={cx(styles.due, 'px-rise-in')}>
        <a className={styles.link} href={routeHash('ideas', { note: note.id })}>
          {note.title}
        </a>
        {summary ? <p className={styles.excerpt}>{summary}</p> : null}
        <p className={cx(shared.muted, shared.tabular)}>
          {t('lab.incubation.since', { when: format.relativeTime(entry.createdAt, now) })}
        </p>
        <div className={shared.actions}>
          <Button
            variant="primary"
            size="sm"
            iconStart={<IconArrowRight size={14} />}
            onClick={onDevelop}
          >
            {t('lab.incubation.develop')}
          </Button>
          <Button variant="secondary" size="sm" onClick={onLater}>
            {t('lab.incubation.later', {
              days: INTERVALS_DAYS[nextStage(item.stage)] ?? 1,
            })}
          </Button>
          <Button variant="ghost" size="sm" onClick={onLetGo}>
            {t('lab.incubation.letGo')}
          </Button>
        </div>
      </Card>
    </li>
  );
}
