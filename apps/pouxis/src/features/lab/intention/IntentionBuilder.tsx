import { useId, useMemo, useState, type CSSProperties } from 'react';
import type { Interval, JournalEntry, Task } from '@pouxis/core';
import { useFormat, useT, type MessageKey } from '../../../i18n/index.ts';
import { store, useCollection, usePrefs } from '../../../store/index.ts';
import {
  Button,
  Card,
  IconCheck,
  IconClock,
  Pill,
  PillGroup,
  TextField,
  cx,
  toast,
} from '../../../ui/index.ts';
import shared from '../shared/panel.module.css';
import { useNow } from '../shared/useNow.ts';
import {
  cleanFragment,
  intentionCandidates,
  intentionTags,
  isComplete,
  linkedTaskId,
  suggestSlot,
  todaysIntention,
  type IntentionDraft,
} from './intention.ts';
import styles from './IntentionBuilder.module.css';

const CUES = ['coffee', 'arrive', 'lunch', 'meeting'] as const;
const EMPTY: IntentionDraft = { action: '', when: '', where: '' };

export function IntentionBuilder() {
  const prefs = usePrefs();
  const now = useNow();
  const tasks = useCollection('tasks');
  const journal = useCollection('journal');
  const saved = todaysIntention(journal, now, prefs);
  const [editing, setEditing] = useState(false);

  if (saved && !editing) {
    return <SavedIntention entry={saved} onChange={() => setEditing(true)} />;
  }
  return (
    <IntentionForm
      tasks={tasks}
      onSaved={() => setEditing(false)}
      candidates={intentionCandidates(tasks, now, prefs)}
    />
  );
}

function SavedIntention({ entry, onChange }: { entry: JournalEntry; onChange: () => void }) {
  const t = useT();
  const format = useFormat();
  const task = useCollection('tasks').find((x) => x.id === linkedTaskId(entry));
  const slot = task?.scheduled;
  return (
    <div className={cx(shared.panel, 'px-rise-in')}>
      <Card variant="tinted" padding="lg" as="section" aria-labelledby="lab-intention-today">
        <div className={styles.saved}>
          <p className={shared.label} id="lab-intention-today">
            {t('lab.intention.today')}
          </p>
          <p className={styles.sentence}>{entry.text}</p>
          {slot ? (
            <p className={cx(shared.muted, styles.slotLine)}>
              <IconClock size={16} />
              <span className={shared.tabular}>
                {t('lab.intention.slotBooked', { range: format.timeRange(slot.start, slot.end) })}
              </span>
            </p>
          ) : null}
        </div>
      </Card>
      <div className={shared.actions}>
        <Button variant="secondary" onClick={onChange}>
          {t('lab.intention.change')}
        </Button>
      </div>
    </div>
  );
}

interface FormProps {
  tasks: readonly Task[];
  candidates: Task[];
  onSaved: () => void;
}

function IntentionForm({ tasks, candidates, onSaved }: FormProps) {
  const t = useT();
  const format = useFormat();
  const prefs = usePrefs();
  const events = useCollection('events');
  const now = useNow();
  const headingId = useId();
  const [draft, setDraft] = useState<IntentionDraft>(EMPTY);
  const [bookSlot, setBookSlot] = useState(false);
  const [triedSave, setTriedSave] = useState(false);

  const selected = candidates.find((c) => c.id === draft.taskId);
  const slot = useMemo(
    () => (selected ? suggestSlot(selected, tasks, events, prefs, now) : undefined),
    [selected, tasks, events, prefs, now],
  );

  const update = (patch: Partial<IntentionDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const chooseTask = (task: Task) => {
    setBookSlot(false);
    if (draft.taskId === task.id) update({ taskId: undefined, action: '' });
    else update({ taskId: task.id, action: task.title });
  };

  const chooseCue = (text: string) => {
    setBookSlot(false);
    update({ when: text });
  };

  const chooseSlot = (interval: Interval) => {
    setBookSlot(true);
    update({ when: t('lab.intention.atTime', { time: format.time(interval.start) }) });
  };

  const sentence = composeSentence(draft, t);
  const complete = isComplete(draft);

  const save = () => {
    setTriedSave(true);
    if (!complete) return;
    const entry = store.create('journal', {
      kind: 'dump',
      text: sentence,
      tags: intentionTags(draft, now, prefs),
    });
    const booked = bookSlot && slot && selected ? bookTask(selected, slot) : undefined;
    toast({
      title: t('lab.intention.saved'),
      tone: 'success',
      action: {
        label: t('common.undo'),
        onClick: () => {
          store.remove('journal', entry.id);
          booked?.();
        },
      },
    });
    setDraft(EMPTY);
    setTriedSave(false);
    onSaved();
  };

  return (
    <section className={shared.panel} aria-labelledby={headingId}>
      <header className={shared.header}>
        <h3 className={shared.heading} id={headingId}>
          {t('lab.intention.heading')}
        </h3>
        <p className={shared.lead}>{t('lab.intention.lead')}</p>
      </header>

      <div className={shared.section}>
        <p className={shared.label}>{t('lab.intention.candidates')}</p>
        {candidates.length === 0 ? (
          <p className={shared.muted}>{t('lab.intention.noCandidates')}</p>
        ) : (
          <ul className={cx(shared.list, 'px-stagger')}>
            {candidates.map((task, i) => (
              <li key={task.id} style={{ '--i': i } as CSSProperties}>
                <button
                  type="button"
                  className={cx(styles.candidate, 'px-press')}
                  aria-pressed={draft.taskId === task.id}
                  onClick={() => chooseTask(task)}
                >
                  <span className={shared.icon} aria-hidden="true">
                    {task.icon ?? '•'}
                  </span>
                  <span className={styles.candidateTitle}>{task.title}</span>
                  {task.estimateMin ? (
                    <span className={cx(shared.muted, shared.tabular)}>
                      {format.duration(task.estimateMin)}
                    </span>
                  ) : null}
                  <span className={styles.check} aria-hidden="true">
                    <IconCheck size={16} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.fields}>
        <TextField
          label={t('lab.intention.action')}
          hint={t('lab.intention.actionHint')}
          value={draft.action}
          onChange={(e) => update({ action: e.target.value, taskId: undefined })}
          maxLength={140}
          error={triedSave && !cleanFragment(draft.action) ? t('lab.intention.missing') : undefined}
        />
        <div className={shared.section}>
          <TextField
            label={t('lab.intention.when')}
            hint={t('lab.intention.whenHint')}
            value={draft.when}
            onChange={(e) => {
              setBookSlot(false);
              update({ when: e.target.value });
            }}
            maxLength={80}
            error={triedSave && !cleanFragment(draft.when) ? t('lab.intention.missing') : undefined}
          />
          <PillGroup label={t('lab.intention.cues')} wrap>
            {slot ? (
              <Pill
                size="sm"
                icon={<IconClock size={14} />}
                selected={bookSlot}
                title={t('lab.intention.slotHint')}
                onSelectedChange={() => chooseSlot(slot)}
              >
                {t('lab.intention.slot', { range: format.timeRange(slot.start, slot.end) })}
              </Pill>
            ) : null}
            {CUES.map((cue) => {
              const text = t(`lab.intention.cue.${cue}` as MessageKey);
              return (
                <Pill
                  key={cue}
                  size="sm"
                  selected={!bookSlot && draft.when === text}
                  onSelectedChange={() => chooseCue(text)}
                >
                  {text}
                </Pill>
              );
            })}
          </PillGroup>
          {selected && !slot ? <p className={shared.muted}>{t('lab.intention.slotNone')}</p> : null}
        </div>
        <TextField
          label={t('lab.intention.where')}
          hint={t('lab.intention.whereHint')}
          optionalText={t('common.state.optional')}
          value={draft.where}
          onChange={(e) => update({ where: e.target.value })}
          maxLength={80}
        />
      </div>

      <Card variant="outlined" padding="lg" aria-live="polite">
        <p className={shared.label}>{t('lab.intention.preview')}</p>
        <p className={cx(styles.sentence, !complete && styles.placeholder)}>{sentence}</p>
      </Card>

      <div className={shared.actions}>
        <Button variant="primary" size="lg" onClick={save} aria-disabled={!complete}>
          {t('lab.intention.save')}
        </Button>
      </div>
    </section>
  );
}

function composeSentence(draft: IntentionDraft, t: ReturnType<typeof useT>): string {
  const action = cleanFragment(draft.action) || '…';
  const when = cleanFragment(draft.when) || '…';
  const where = cleanFragment(draft.where);
  return where
    ? t('lab.intention.sentenceWhere', { when, where, action })
    : t('lab.intention.sentence', { when, action });
}

/** Books `slot` on the task and returns an undo callback restoring its previous plan. */
function bookTask(task: Task, slot: Interval): () => void {
  const before = { scheduled: task.scheduled, floatingDay: task.floatingDay, status: task.status };
  store.update('tasks', task.id, {
    scheduled: slot,
    floatingDay: undefined,
    status: task.status === 'inbox' ? 'todo' : task.status,
  });
  return () => store.update('tasks', task.id, before);
}
