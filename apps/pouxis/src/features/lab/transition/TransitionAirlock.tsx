import { useId, useState, type FormEvent } from 'react';
import type { Id, JournalEntry, Task } from '@pouxis/core';
import { useFormat, useT } from '../../../i18n/index.ts';
import { store, useCollection, usePrefs } from '../../../store/index.ts';
import {
  Button,
  Card,
  Pill,
  PillGroup,
  ProgressBar,
  TextField,
  cx,
  toast,
} from '../../../ui/index.ts';
import shared from '../shared/panel.module.css';
import { useNow } from '../shared/useNow.ts';
import {
  SETTLE_SECONDS,
  leavingCandidates,
  nextCandidates,
  parseResume,
  resumeNoteFor,
  settleProgress,
  statusChanges,
  transitionTags,
  transitionText,
} from './transition.ts';
import styles from './TransitionAirlock.module.css';

interface Settling {
  startedAt: number;
  nextId: Id | null;
}

export function TransitionAirlock() {
  const t = useT();
  const headingId = useId();
  const [settling, setSettling] = useState<Settling | null>(null);

  return (
    <section className={shared.panel} aria-labelledby={headingId}>
      <header className={shared.header}>
        <h3 className={shared.heading} id={headingId}>
          {t('lab.transition.heading')}
        </h3>
        <p className={shared.lead}>{t('lab.transition.lead')}</p>
      </header>
      {settling ? (
        <Settle settling={settling} onDone={() => setSettling(null)} />
      ) : (
        <Airlock onPassed={(nextId) => setSettling({ startedAt: Date.now(), nextId })} />
      )}
    </section>
  );
}

function Airlock({ onPassed }: { onPassed: (nextId: Id | null) => void }) {
  const t = useT();
  const prefs = usePrefs();
  const now = useNow();
  const tasks = useCollection('tasks');
  const journal = useCollection('journal');
  const [leavingId, setLeavingId] = useState<Id | null>(null);
  const [nextId, setNextId] = useState<Id | null>(null);
  const [where, setWhere] = useState('');
  const [nextStep, setNextStep] = useState('');

  const touched = leavingCandidates(tasks, now, prefs.timeZone);
  const leavingOptions =
    touched.length > 0 ? touched : nextCandidates(tasks, null, now, prefs.timeZone);
  const leaving = tasks.find((task) => task.id === leavingId);
  const next = tasks.find((task) => task.id === nextId && task.id !== leavingId);
  const nextOptions = nextCandidates(tasks, leavingId, now, prefs.timeZone);
  const ready = leaving !== undefined && (where.trim() || nextStep.trim()) !== '';

  if (leavingOptions.length === 0) {
    return <p className={shared.muted}>{t('lab.transition.empty')}</p>;
  }

  const pass = (event: FormEvent) => {
    event.preventDefault();
    if (!leaving || !ready) return;
    const entry: JournalEntry = store.create('journal', {
      kind: 'dump',
      text: transitionText({ where, next: nextStep }),
      tags: transitionTags(leaving.id),
    });
    const changes = statusChanges(leaving, next);
    for (const change of changes) store.update('tasks', change.id, change.patch);
    toast({
      title: t('lab.transition.saved'),
      tone: 'success',
      action: {
        label: t('common.undo'),
        onClick: () => {
          store.remove('journal', entry.id);
          for (const change of changes) store.update('tasks', change.id, change.before);
        },
      },
    });
    onPassed(next?.id ?? null);
  };

  return (
    <form className={shared.panel} onSubmit={pass}>
      <TaskPicker
        label={t('lab.transition.leaving')}
        tasks={leavingOptions}
        selectedId={leavingId}
        onSelect={(id) => {
          setLeavingId(id);
          if (id === nextId) setNextId(null);
        }}
      />

      {leaving ? (
        <div className={cx(styles.fields, 'px-rise-in')}>
          <TextField
            label={t('lab.transition.where')}
            hint={t('lab.transition.whereHint')}
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            maxLength={140}
          />
          <TextField
            label={t('lab.transition.nextStep')}
            hint={t('lab.transition.nextStepHint')}
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            maxLength={140}
          />
        </div>
      ) : null}

      {leaving && nextOptions.length > 0 ? (
        <TaskPicker
          label={t('lab.transition.going')}
          tasks={nextOptions}
          selectedId={next?.id ?? null}
          onSelect={setNextId}
        />
      ) : null}

      {next ? <LastNote task={next} journal={journal} /> : null}

      <div className={shared.actions}>
        <Button type="submit" variant="primary" disabled={!ready}>
          {t('lab.transition.pass')}
        </Button>
        {leaving && !ready ? (
          <span className={shared.muted}>{t('lab.transition.missing')}</span>
        ) : null}
      </div>
    </form>
  );
}

interface TaskPickerProps {
  label: string;
  tasks: readonly Task[];
  selectedId: Id | null;
  onSelect: (id: Id | null) => void;
}

function TaskPicker({ label, tasks, selectedId, onSelect }: TaskPickerProps) {
  return (
    <div className={shared.section}>
      <p className={shared.label}>{label}</p>
      <PillGroup label={label} wrap>
        {tasks.map((task) => (
          <Pill
            key={task.id}
            size="sm"
            selected={task.id === selectedId}
            icon={task.icon ? <span>{task.icon}</span> : undefined}
            onSelectedChange={(on) => onSelect(on ? task.id : null)}
          >
            {task.title}
          </Pill>
        ))}
      </PillGroup>
    </div>
  );
}

function LastNote({ task, journal }: { task: Task; journal: readonly JournalEntry[] }) {
  const t = useT();
  const format = useFormat();
  const now = useNow();
  const entry = resumeNoteFor(journal, task.id);
  if (!entry) return null;
  const note = parseResume(entry.text);
  return (
    <Card variant="tinted" padding="md" as="section" aria-label={t('lab.transition.lastNote')}>
      <div className={styles.note}>
        <p className={shared.label}>
          {t('lab.transition.lastNoteWhen', { when: format.relativeTime(entry.createdAt, now) })}
        </p>
        {note.where ? <p className={styles.noteText}>{note.where}</p> : null}
        {note.next ? (
          <p className={shared.muted}>{t('lab.transition.lastNext', { next: note.next })}</p>
        ) : null}
      </div>
    </Card>
  );
}

function Settle({ settling, onDone }: { settling: Settling; onDone: () => void }) {
  const t = useT();
  const now = useNow(1000);
  const tasks = useCollection('tasks');
  const journal = useCollection('journal');
  const progress = settleProgress(settling.startedAt, now);
  const remaining = Math.ceil(SETTLE_SECONDS * (1 - progress));
  const next = tasks.find((task) => task.id === settling.nextId);
  const settled = progress >= 1;

  return (
    <div className={cx(shared.section, 'px-fade-in')}>
      <p className={styles.breathe} aria-live="polite">
        {settled ? t('lab.transition.settled') : t('lab.transition.breathe')}
      </p>
      <ProgressBar
        value={progress}
        label={t('lab.transition.settle')}
        valueText={t('lab.transition.remaining', { seconds: remaining })}
        showValue
        tone="success"
      />
      {next ? (
        <>
          <p className={shared.muted}>{t('lab.transition.nowOn', { title: next.title })}</p>
          <LastNote task={next} journal={journal} />
        </>
      ) : null}
      <div className={shared.actions}>
        <Button variant={settled ? 'primary' : 'secondary'} onClick={onDone}>
          {settled ? t('lab.transition.go') : t('lab.transition.skip')}
        </Button>
      </div>
    </div>
  );
}
