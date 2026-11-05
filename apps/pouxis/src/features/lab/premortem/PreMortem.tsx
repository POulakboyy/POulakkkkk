import { useId, useState, type FormEvent } from 'react';
import type { Id, JournalEntry, Task } from '@pouxis/core';
import { useFormat, useT } from '../../../i18n/index.ts';
import { store, useCollection, usePrefs } from '../../../store/index.ts';
import {
  Button,
  Card,
  IconPlus,
  Pill,
  PillGroup,
  Switch,
  TextField,
  cx,
  toast,
} from '../../../ui/index.ts';
import shared from '../shared/panel.module.css';
import { useNow } from '../shared/useNow.ts';
import {
  MAX_RISKS,
  cleanRisks,
  failureDate,
  lastPremortem,
  paradeRecords,
  parsePremortem,
  premortemCandidates,
  premortemTags,
  premortemText,
  type Risk,
} from './premortem.ts';
import styles from './PreMortem.module.css';

const EMPTY_RISK: Risk = { cause: '', parade: '' };

export function PreMortem() {
  const t = useT();
  const tasks = useCollection('tasks');
  const headingId = useId();
  const [targetId, setTargetId] = useState<Id | null>(null);
  const candidates = premortemCandidates(tasks);
  const target = tasks.find((task) => task.id === targetId);

  return (
    <section className={shared.panel} aria-labelledby={headingId}>
      <header className={shared.header}>
        <h3 className={shared.heading} id={headingId}>
          {t('lab.premortem.heading')}
        </h3>
        <p className={shared.lead}>{t('lab.premortem.lead')}</p>
      </header>

      {candidates.length === 0 ? (
        <p className={shared.muted}>{t('lab.premortem.empty')}</p>
      ) : (
        <div className={shared.section}>
          <p className={shared.label}>{t('lab.premortem.pick')}</p>
          <PillGroup label={t('lab.premortem.pick')} wrap>
            {candidates.map((task) => (
              <Pill
                key={task.id}
                size="sm"
                selected={task.id === targetId}
                onClick={() => setTargetId(task.id === targetId ? null : task.id)}
              >
                {task.title}
              </Pill>
            ))}
          </PillGroup>
        </div>
      )}

      {target ? (
        <Exercise key={target.id} target={target} onDone={() => setTargetId(null)} />
      ) : null}
    </section>
  );
}

function Exercise({ target, onDone }: { target: Task; onDone: () => void }) {
  const t = useT();
  const format = useFormat();
  const prefs = usePrefs();
  const now = useNow();
  const journal = useCollection('journal');
  const [risks, setRisks] = useState<Risk[]>([EMPTY_RISK]);
  const [createParades, setCreateParades] = useState(true);
  const previous = lastPremortem(journal, target.id);
  const valid = cleanRisks(risks);

  const edit = (index: number, patch: Partial<Risk>) =>
    setRisks((list) => list.map((risk, i) => (i === index ? { ...risk, ...patch } : risk)));

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (valid.length === 0) return;
    const entry: JournalEntry = store.create('journal', {
      kind: 'dump',
      text: premortemText(valid),
      tags: premortemTags(target.id),
    });
    const created = createParades
      ? paradeRecords(target, valid).map((record) => store.create('tasks', record))
      : [];
    toast({
      title: t('lab.premortem.saved', { count: created.length }),
      tone: 'success',
      action: {
        label: t('common.undo'),
        onClick: () => {
          store.remove('journal', entry.id);
          created.forEach((task) => store.remove('tasks', task.id));
        },
      },
    });
    onDone();
  };

  return (
    <form className={cx(shared.section, 'px-rise-in')} onSubmit={save}>
      <Card variant="tinted" padding="lg">
        <p className={styles.prompt}>
          {t('lab.premortem.prompt', {
            date: format.date(failureDate(target, now, prefs.timeZone), 'dayMonth'),
            title: target.title,
          })}
        </p>
      </Card>

      {previous ? <Previous entry={previous} /> : null}

      <ol className={styles.risks}>
        {risks.map((risk, i) => (
          <li key={i} className={styles.risk}>
            <TextField
              label={t('lab.premortem.cause', { n: i + 1 })}
              hint={i === 0 ? t('lab.premortem.causeHint') : undefined}
              value={risk.cause}
              onChange={(e) => edit(i, { cause: e.target.value })}
              maxLength={140}
            />
            <TextField
              label={t('lab.premortem.parade')}
              hint={i === 0 ? t('lab.premortem.paradeHint') : undefined}
              value={risk.parade}
              onChange={(e) => edit(i, { parade: e.target.value })}
              maxLength={120}
            />
          </li>
        ))}
      </ol>

      <div className={shared.actions}>
        {risks.length < MAX_RISKS ? (
          <Button
            variant="ghost"
            size="sm"
            iconStart={<IconPlus size={14} />}
            onClick={() => setRisks((list) => [...list, EMPTY_RISK])}
          >
            {t('lab.premortem.addCause')}
          </Button>
        ) : null}
      </div>

      <Switch
        label={t('lab.premortem.asTasks')}
        description={t('lab.premortem.asTasksHint')}
        checked={createParades}
        onCheckedChange={setCreateParades}
      />

      <div className={shared.actions}>
        <Button type="submit" variant="primary" disabled={valid.length === 0}>
          {t('lab.premortem.save')}
        </Button>
        {valid.length === 0 ? (
          <span className={shared.muted}>{t('lab.premortem.missing')}</span>
        ) : null}
      </div>
    </form>
  );
}

function Previous({ entry }: { entry: JournalEntry }) {
  const t = useT();
  const format = useFormat();
  return (
    <div className={shared.section}>
      <p className={shared.label}>
        {t('lab.premortem.previous', { date: format.date(entry.createdAt, 'dayMonthShort') })}
      </p>
      <ul className={shared.list}>
        {parsePremortem(entry.text).map((risk, i) => (
          <li key={i} className={shared.muted}>
            {risk.parade
              ? t('lab.premortem.previousLine', { cause: risk.cause, parade: risk.parade })
              : risk.cause}
          </li>
        ))}
      </ul>
    </div>
  );
}
