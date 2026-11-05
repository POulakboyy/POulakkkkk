/**
 * Friction journal (5.5): one line to park what blocks, then back to work. Entries that keep
 * coming back are flagged with `insights.weeklyReview` blockers.
 */
import { useMemo, useState } from 'react';
import type { JournalEntry } from '@pouxis/core';
import { useFormat, useT } from '../../../i18n/index.ts';
import { store, useCollection, usePrefs } from '../../../store/index.ts';
import {
  Badge,
  Button,
  Chip,
  cx,
  IconCheck,
  IconRepeat,
  Pill,
  PillGroup,
  TextField,
  toast,
} from '../../../ui/index.ts';
import {
  FRICTION_KINDS,
  frictionKind,
  recurringFriction,
  RESOLVED_TAG,
  sortFriction,
  type FrictionKind,
} from '../lib/notes.ts';
import s from './Journal.module.css';

const KIND_CATEGORY: Record<FrictionKind, 1 | 3 | 5 | 7> = {
  technical: 3,
  creative: 1,
  external: 5,
  other: 7,
};

export function FrictionJournal() {
  const t = useT();
  const format = useFormat();
  const { timeZone } = usePrefs();
  const journal = useCollection('journal');
  const [text, setText] = useState('');
  const [kind, setKind] = useState<FrictionKind>('technical');

  const entries = useMemo(() => sortFriction(journal), [journal]);
  const recurring = useMemo(
    () => recurringFriction(journal, Date.now(), timeZone),
    [journal, timeZone],
  );

  const log = () => {
    const value = text.trim();
    if (!value) return;
    store.create('journal', { kind: 'friction', text: value, tags: [kind] });
    setText('');
    toast({ id: 'friction', title: t('ideas.friction.logged') });
  };

  const toggleResolved = (entry: JournalEntry) => {
    const resolved = entry.tags.includes(RESOLVED_TAG);
    store.update('journal', entry.id, {
      tags: resolved
        ? entry.tags.filter((tag) => tag !== RESOLVED_TAG)
        : [...entry.tags, RESOLVED_TAG],
    });
  };

  return (
    <section className={s.journal} aria-labelledby="friction-title">
      <header className={s.header}>
        <h2 id="friction-title" className={s.title}>
          {t('ideas.friction.title')}
        </h2>
        <p className={s.hint}>{t('ideas.friction.hint')}</p>
      </header>

      <form
        className={s.composer}
        onSubmit={(e) => {
          e.preventDefault();
          log();
        }}
      >
        <TextField
          label={t('ideas.friction.label')}
          hideLabel
          size="lg"
          placeholder={t('ideas.friction.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          wrapperClassName={s.field}
        />
        <div className={s.composerRow}>
          <PillGroup label={t('ideas.friction.kind.label')} wrap>
            {FRICTION_KINDS.map((k) => (
              <Pill key={k} size="sm" selected={kind === k} onSelectedChange={() => setKind(k)}>
                {t(`ideas.friction.kind.${k}`)}
              </Pill>
            ))}
          </PillGroup>
          <Button type="submit" variant="primary" disabled={!text.trim()}>
            {t('ideas.friction.add')}
          </Button>
        </div>
      </form>

      {entries.length === 0 ? (
        <p className={s.empty}>{t('ideas.friction.empty')}</p>
      ) : (
        <ul className={s.list}>
          {entries.map((entry) => {
            const resolved = entry.tags.includes(RESOLVED_TAG);
            const k = frictionKind(entry);
            return (
              <li key={entry.id} className={cx(s.entry, resolved && s.resolved)}>
                <div className={s.entryBody}>
                  <p className={s.entryText}>{entry.text}</p>
                  <div className={s.entryMeta}>
                    <Chip category={KIND_CATEGORY[k]}>{t(`ideas.friction.kind.${k}`)}</Chip>
                    {recurring.has(entry.id) && !resolved && (
                      <Badge tone="warning" icon={<IconRepeat size={12} />}>
                        {t('ideas.friction.recurring')}
                      </Badge>
                    )}
                    <time dateTime={new Date(entry.createdAt).toISOString()} className={s.time}>
                      {format.relativeTime(entry.createdAt)}
                    </time>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={resolved ? 'ghost' : 'secondary'}
                  iconStart={resolved ? undefined : <IconCheck />}
                  onClick={() => toggleResolved(entry)}
                >
                  {resolved ? t('ideas.friction.reopen') : t('ideas.friction.resolve')}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
