import { useId, useState, type CSSProperties } from 'react';
import type { Id, JournalEntry, Task } from '@pouxis/core';
import { useFormat, useT } from '../../../i18n/index.ts';
import { store, useCollection, usePrefs } from '../../../store/index.ts';
import {
  Button,
  Card,
  IconCheck,
  IconStar,
  SegmentedControl,
  TextField,
  cx,
  toast,
} from '../../../ui/index.ts';
import shared from '../shared/panel.module.css';
import { dayTag } from '../shared/journal.ts';
import { useNow } from '../shared/useNow.ts';
import {
  SHUTDOWN_TAG,
  defaultChoices,
  highlight,
  movedCount,
  recordedMoved,
  reviewDay,
  shutdownChanges,
  shutdownTags,
  todaysShutdown,
  type OpenChoice,
} from './shutdown.ts';
import styles from './ShutdownRitual.module.css';

const STEPS = ['done', 'open', 'resume'] as const;
type Step = (typeof STEPS)[number];

export function ShutdownRitual() {
  const prefs = usePrefs();
  const now = useNow();
  const journal = useCollection('journal');
  const closed = todaysShutdown(journal, now, prefs.timeZone);
  const [reopened, setReopened] = useState(false);

  if (closed && !reopened) {
    return <ClosedDay entry={closed} onReopen={() => setReopened(true)} />;
  }
  return <Ritual onClosed={() => setReopened(false)} />;
}

function Ritual({ onClosed }: { onClosed: () => void }) {
  const t = useT();
  const prefs = usePrefs();
  const now = useNow();
  const tasks = useCollection('tasks');
  const headingId = useId();
  const [step, setStep] = useState<Step>('done');
  const [choices, setChoices] = useState<Record<Id, OpenChoice>>({});
  const [first, setFirst] = useState('');
  const [friction, setFriction] = useState('');

  const { done, open } = reviewDay(tasks, now, prefs.timeZone);
  const effective = { ...defaultChoices(open), ...choices };
  const index = STEPS.indexOf(step);
  const titleKey = `lab.shutdown.${step}.title` as const;
  const leadKey = `lab.shutdown.${step}.lead` as const;

  const close = () => {
    const changes = shutdownChanges(open, effective, now, prefs.timeZone);
    for (const change of changes) store.update('tasks', change.id, change.patch);
    const created: JournalEntry[] = [
      store.create('journal', {
        kind: 'dump',
        text: first.trim(),
        tags: shutdownTags(now, prefs.timeZone, movedCount(changes)),
      }),
    ];
    if (friction.trim()) {
      created.push(
        store.create('journal', {
          kind: 'friction',
          text: friction.trim(),
          tags: [SHUTDOWN_TAG, dayTag(now, prefs.timeZone)],
        }),
      );
    }
    toast({
      title: t('lab.shutdown.closed.toast'),
      tone: 'success',
      action: {
        label: t('common.undo'),
        onClick: () => {
          for (const change of changes) store.update('tasks', change.id, change.before);
          for (const entry of created) store.remove('journal', entry.id);
        },
      },
    });
    onClosed();
  };

  return (
    <section className={shared.panel} aria-labelledby={headingId}>
      <header className={shared.header}>
        <p className={cx(shared.label, shared.tabular)}>
          {t('lab.shutdown.stepLabel', { current: index + 1, total: STEPS.length })}
        </p>
        <div className={styles.steps} aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s} className={styles.dot} data-on={i <= index || undefined} />
          ))}
        </div>
        <h3 className={shared.heading} id={headingId}>
          {t(titleKey)}
        </h3>
        <p className={shared.lead}>{t(leadKey)}</p>
      </header>

      <div key={step} className="px-rise-in">
        {step === 'done' ? <DoneList done={done} /> : null}
        {step === 'open' ? (
          <OpenList
            open={open}
            choices={effective}
            onChoose={(id, choice) => setChoices((c) => ({ ...c, [id]: choice }))}
          />
        ) : null}
        {step === 'resume' ? (
          <div className={styles.fields}>
            <TextField
              label={t('lab.shutdown.resume.first')}
              hint={t('lab.shutdown.resume.firstHint')}
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              maxLength={140}
            />
            <TextField
              label={t('lab.shutdown.resume.friction')}
              hint={t('lab.shutdown.resume.frictionHint')}
              optionalText={t('common.state.optional')}
              value={friction}
              onChange={(e) => setFriction(e.target.value)}
              maxLength={200}
            />
          </div>
        ) : null}
      </div>

      <div className={shared.actions}>
        {index > 0 ? (
          <Button variant="ghost" onClick={() => setStep(STEPS[index - 1] ?? 'done')}>
            {t('lab.shutdown.back')}
          </Button>
        ) : null}
        {step === 'resume' ? (
          <Button variant="primary" size="lg" onClick={close}>
            {t('lab.shutdown.resume.close')}
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={() => setStep(STEPS[index + 1] ?? 'resume')}>
            {t('lab.shutdown.next')}
          </Button>
        )}
      </div>
    </section>
  );
}

function DoneList({ done }: { done: readonly Task[] }) {
  const t = useT();
  const format = useFormat();
  if (done.length === 0) return <p className={shared.muted}>{t('lab.shutdown.done.empty')}</p>;
  return (
    <ul className={cx(shared.list, 'px-stagger')}>
      {done.map((task, i) => (
        <li key={task.id} className={styles.row} style={{ '--i': i } as CSSProperties}>
          <span className={styles.tick} aria-hidden="true">
            <IconCheck size={14} />
          </span>
          <span className={styles.rowTitle}>{task.title}</span>
          {task.completedAt ? (
            <span className={cx(shared.muted, shared.tabular)}>
              {format.time(task.completedAt)}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

interface OpenListProps {
  open: readonly Task[];
  choices: Readonly<Record<Id, OpenChoice>>;
  onChoose: (id: Id, choice: OpenChoice) => void;
}

function OpenList({ open, choices, onChoose }: OpenListProps) {
  const t = useT();
  if (open.length === 0) return <p className={shared.muted}>{t('lab.shutdown.open.empty')}</p>;
  const options = (['tomorrow', 'later', 'keep'] as const).map((value) => ({
    value,
    label: t(`lab.shutdown.open.${value}`),
  }));
  return (
    <ul className={shared.list}>
      {open.map((task) => (
        <li key={task.id} className={styles.openRow}>
          <span className={styles.rowTitle}>
            {task.icon ? <span aria-hidden="true">{task.icon} </span> : null}
            {task.title}
          </span>
          <SegmentedControl
            size="sm"
            label={t('lab.shutdown.open.choices', { title: task.title })}
            options={options}
            value={choices[task.id] ?? 'keep'}
            onChange={(choice) => onChoose(task.id, choice)}
          />
        </li>
      ))}
    </ul>
  );
}

function ClosedDay({ entry, onReopen }: { entry: JournalEntry; onReopen: () => void }) {
  const t = useT();
  const format = useFormat();
  const prefs = usePrefs();
  const now = useNow();
  const tasks = useCollection('tasks');
  const { done } = reviewDay(tasks, now, prefs.timeZone);
  const best = highlight(done);
  return (
    <div className={cx(shared.panel, 'px-rise-in')}>
      <Card variant="tinted" padding="lg" as="section" aria-label={t('lab.shutdown.closed.title')}>
        <div className={styles.closed}>
          <p className={styles.closedTitle}>{t('lab.shutdown.closed.title')}</p>
          {best ? (
            <p className={styles.highlight}>
              <IconStar size={16} />
              <span>{t('lab.shutdown.closed.highlight', { title: best.title })}</span>
            </p>
          ) : null}
          <p className={cx(shared.muted, shared.tabular)}>
            {t('lab.shutdown.closed.summary', { done: done.length, moved: recordedMoved(entry) })}
          </p>
          {entry.text ? (
            <p className={styles.resume}>
              {t('lab.shutdown.closed.resume', { first: entry.text })}
            </p>
          ) : null}
          <p className={cx(shared.muted, shared.tabular)}>
            {t('lab.shutdown.closed.at', { time: format.time(entry.createdAt) })}
          </p>
        </div>
      </Card>
      <div className={shared.actions}>
        <Button variant="secondary" onClick={onReopen}>
          {t('lab.shutdown.closed.reopen')}
        </Button>
      </div>
    </div>
  );
}
