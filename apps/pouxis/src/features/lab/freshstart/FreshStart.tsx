import { useId, useState, type FormEvent } from 'react';
import type { Id, JournalEntry, Task } from '@pouxis/core';
import { useFormat, useT } from '../../../i18n/index.ts';
import { store, useCollection, usePrefs } from '../../../store/index.ts';
import {
  Button,
  IconArchive,
  IconRepeat,
  SegmentedControl,
  TextField,
  cx,
  toast,
} from '../../../ui/index.ts';
import shared from '../shared/panel.module.css';
import { useNow } from '../shared/useNow.ts';
import {
  firstStepRecord,
  freshStartTags,
  letGoChange,
  nextLandmarks,
  restartChange,
  stalledTasks,
  type Landmark,
  type LandmarkKind,
  type TaskChange,
} from './freshstart.ts';
import styles from './FreshStart.module.css';

export function FreshStart() {
  const t = useT();
  const format = useFormat();
  const prefs = usePrefs();
  const now = useNow();
  const tasks = useCollection('tasks');
  const headingId = useId();
  const landmarks = nextLandmarks(now, prefs.timeZone);
  const [kind, setKind] = useState<LandmarkKind>(landmarks[0]?.kind ?? 'week');
  const [editing, setEditing] = useState<Id | null>(null);
  const landmark = landmarks.find((l) => l.kind === kind) ?? landmarks[0];
  const stalled = stalledTasks(tasks, prefs, now);

  const apply = (change: TaskChange, title: string, extra: () => (() => void)[] = () => []) => {
    store.update('tasks', change.id, change.patch);
    const undo = extra();
    toast({
      title,
      tone: 'success',
      action: {
        label: t('common.undo'),
        onClick: () => {
          store.update('tasks', change.id, change.before);
          undo.forEach((fn) => fn());
        },
      },
    });
  };

  const restart = (task: Task, firstStep: string) => {
    if (!landmark) return;
    apply(restartChange(task, landmark), t('lab.freshstart.restarted'), () => {
      const entry: JournalEntry = store.create('journal', {
        kind: 'dump',
        text: task.title,
        tags: freshStartTags(task, landmark.kind),
      });
      const undo = [() => store.remove('journal', entry.id)];
      if (firstStep.trim()) {
        const step = store.create('tasks', firstStepRecord(task, firstStep, landmark));
        undo.push(() => store.remove('tasks', step.id));
      }
      return undo;
    });
    setEditing(null);
  };

  return (
    <section className={shared.panel} aria-labelledby={headingId}>
      <header className={shared.header}>
        <h3 className={shared.heading} id={headingId}>
          {t('lab.freshstart.heading')}
        </h3>
        <p className={shared.lead}>{t('lab.freshstart.lead')}</p>
      </header>

      {stalled.length === 0 ? (
        <p className={shared.muted}>{t('lab.freshstart.empty')}</p>
      ) : (
        <>
          {landmarks.length > 1 ? (
            <SegmentedControl
              size="sm"
              label={t('lab.freshstart.landmark.label')}
              options={landmarks.map((l) => ({
                value: l.kind,
                label: t(`lab.freshstart.landmark.${l.kind}`, {
                  date: format.date(l.at, 'dayMonthShort'),
                }),
              }))}
              value={kind}
              onChange={setKind}
            />
          ) : null}
          <ul className={shared.list}>
            {stalled.map((task) => (
              <StalledRow
                key={task.id}
                task={task}
                landmark={landmark}
                editing={editing === task.id}
                onEdit={() => setEditing(task.id)}
                onCancel={() => setEditing(null)}
                onRestart={(step) => restart(task, step)}
                onLetGo={() => apply(letGoChange(task), t('lab.freshstart.lettingGo'))}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

interface StalledRowProps {
  task: Task;
  landmark: Landmark | undefined;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onRestart: (firstStep: string) => void;
  onLetGo: () => void;
}

function StalledRow({
  task,
  landmark,
  editing,
  onEdit,
  onCancel,
  onRestart,
  onLetGo,
}: StalledRowProps) {
  const t = useT();
  const format = useFormat();
  const now = useNow();
  const [step, setStep] = useState('');
  const when = landmark ? format.relativeDay(landmark.at, now) : '';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onRestart(step);
    setStep('');
  };

  return (
    <li className={styles.row}>
      <div className={styles.summary}>
        <span className={styles.title}>{task.title}</span>
        <span className={cx(shared.muted, shared.tabular)}>
          {task.postponedCount > 0
            ? t('lab.freshstart.postponed', { count: task.postponedCount })
            : t('lab.freshstart.waiting', { when: format.relativeTime(task.createdAt, now) })}
        </span>
      </div>
      {editing ? (
        <form className={cx(styles.form, 'px-rise-in')} onSubmit={submit}>
          <p className={shared.muted}>{t('lab.freshstart.kindWords')}</p>
          <TextField
            label={t('lab.freshstart.firstStep')}
            hint={t('lab.freshstart.firstStepHint')}
            value={step}
            onChange={(e) => setStep(e.target.value)}
            maxLength={120}
          />
          <div className={shared.actions}>
            <Button type="submit" variant="primary" iconStart={<IconRepeat size={16} />}>
              {t('lab.freshstart.confirm', { when })}
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              {t('lab.freshstart.cancel')}
            </Button>
          </div>
        </form>
      ) : (
        <div className={shared.actions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
            disabled={!landmark}
            aria-label={t('lab.freshstart.restartLabel', { title: task.title, when })}
          >
            {t('lab.freshstart.restart', { when })}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconStart={<IconArchive size={14} />}
            onClick={onLetGo}
            aria-label={t('lab.freshstart.letGoLabel', { title: task.title })}
          >
            {t('lab.freshstart.letGo')}
          </Button>
        </div>
      )}
    </li>
  );
}
