/** Smaller sections of the task sheet: recurrence, tags, notes, Pomodoro history, place. */
import { useState, type KeyboardEvent } from 'react';
import { FOCUS_START_EVENT } from '../../app/actions.ts';
import { navigate } from '../../app/router.ts';
import { recurrence, tasks as engine, type Task } from '@pouxis/core';
import { store } from '../../store/index.ts';
import {
  Button,
  Chip,
  IconMapPin,
  IconPlay,
  IconPlus,
  Pill,
  PillGroup,
  SegmentedControl,
  TextArea,
  TextField,
} from '../../ui/index.ts';
import { useTasks } from './context.ts';
import { Markdown } from './markdown.tsx';
import { plannedAt } from './model.ts';
import s from './Tasks.module.css';

/* ------------------------------------------------------------------------------------------ */
/* Recurrence (2.9)                                                                            */
/* ------------------------------------------------------------------------------------------ */

const PRESETS = ['daily', 'weekdays', 'weekly', 'monthly', 'yearly'] as const;

/** Live interpretation of a recurrence rule typed in any syntax (phrase, cron, RRULE). */
export function interpretRule(
  text: string,
  ctx: { locale: 'fr' | 'en'; timeZone: string; from: number; dtstart?: number },
): { rule: string; next: number[] } | null | 'empty' {
  if (!text.trim()) return 'empty';
  const rule = recurrence.parseRule(text, { locale: ctx.locale });
  if (!rule) return null;
  const next = recurrence.occurrences(rule, {
    from: ctx.from,
    to: Number.POSITIVE_INFINITY,
    timeZone: ctx.timeZone,
    ...(ctx.dtstart !== undefined && { dtstart: ctx.dtstart }),
    limit: 3,
  });
  return { rule: recurrence.describe(rule, ctx.locale, { timeZone: ctx.timeZone }), next };
}

export function RecurrenceField({ task }: { task: Task }) {
  const { t, fmt, prefs, now } = useTasks();
  const [text, setText] = useState(task.recurrence ?? '');
  const planned = plannedAt(task);
  const result = interpretRule(text, {
    locale: prefs.locale,
    timeZone: prefs.timeZone,
    from: now,
    ...(planned !== undefined && { dtstart: planned }),
  });

  const commit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === (task.recurrence ?? '')) return;
    if (trimmed && !recurrence.parseRule(trimmed, { locale: prefs.locale })) return;
    store.update('tasks', task.id, { recurrence: trimmed || undefined });
  };
  const choose = (value: string) => {
    setText(value);
    commit(value);
  };

  const feedback =
    result === 'empty'
      ? { hint: t('tasks.recurrence.none') }
      : result === null
        ? { error: t('tasks.recurrence.invalid') }
        : {
            hint: [
              t('tasks.recurrence.understood', { rule: result.rule }),
              result.next.length > 0 &&
                t('tasks.recurrence.next', {
                  dates: fmt.list(result.next.map((ts) => fmt.date(ts, 'weekdayDayMonth'))),
                }),
            ]
              .filter(Boolean)
              .join(' · '),
          };

  return (
    <div className={s.stack}>
      <TextField
        label={t('tasks.recurrence.label')}
        value={text}
        placeholder={t('tasks.recurrence.placeholder')}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text)}
        onKeyDown={(e) => e.key === 'Enter' && commit(text)}
        {...feedback}
      />
      <PillGroup label={t('tasks.recurrence.label')} wrap>
        {PRESETS.map((p) => {
          const value = t(`tasks.recurrence.presetRules.${p}`);
          return (
            <Pill
              key={p}
              size="sm"
              selected={text.trim() === value}
              onSelectedChange={(on) => choose(on ? value : '')}
            >
              {t(`tasks.recurrence.presets.${p}`)}
            </Pill>
          );
        })}
      </PillGroup>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Tags                                                                                        */
/* ------------------------------------------------------------------------------------------ */

export function TagsField({ task }: { task: Task }) {
  const { t } = useTasks();
  const [draft, setDraft] = useState('');
  const add = () => {
    const tag = draft.trim().replace(/^#/, '');
    setDraft('');
    if (!tag) return;
    const exists = task.tags.some((x) => engine.foldTag(x) === engine.foldTag(tag));
    if (!exists) store.update('tasks', task.id, { tags: [...task.tags, tag] });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !draft && task.tags.length > 0) {
      store.update('tasks', task.id, { tags: task.tags.slice(0, -1) });
    }
  };
  return (
    <div className={s.stack}>
      {task.tags.length > 0 && (
        <ul className={s.chips} aria-label={t('tasks.fields.tags')}>
          {task.tags.map((tag) => (
            <li key={tag}>
              <Chip
                onRemove={() =>
                  store.update('tasks', task.id, { tags: task.tags.filter((x) => x !== tag) })
                }
                removeLabel={t('tasks.detail.removeTag', { tag })}
              >
                #{tag}
              </Chip>
            </li>
          ))}
        </ul>
      )}
      <TextField
        label={t('tasks.fields.addTag')}
        value={draft}
        placeholder={t('tasks.detail.tagPlaceholder')}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        iconStart={<IconPlus />}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Notes (Markdown)                                                                            */
/* ------------------------------------------------------------------------------------------ */

export function NotesField({ task }: { task: Task }) {
  const { t } = useTasks();
  const [mode, setMode] = useState<'write' | 'preview'>(task.notes ? 'preview' : 'write');
  const [text, setText] = useState(task.notes ?? '');
  const commit = () => {
    const value = text.trim() ? text : undefined;
    if (value !== task.notes) store.update('tasks', task.id, { notes: value });
  };
  return (
    <div className={s.stack}>
      <div className={s.notesBar}>
        <span className={s.fieldLabel}>{t('tasks.fields.notes')}</span>
        <SegmentedControl
          size="sm"
          label={t('tasks.fields.notes')}
          value={mode}
          onChange={(m) => {
            if (m === 'preview') commit();
            setMode(m);
          }}
          options={[
            { value: 'write', label: t('tasks.detail.write') },
            { value: 'preview', label: t('tasks.detail.preview') },
          ]}
        />
      </div>
      {mode === 'write' ? (
        <TextArea
          label={t('tasks.fields.notes')}
          hideLabel
          autoGrow
          maxRows={14}
          value={text}
          placeholder={t('tasks.fields.notesPlaceholder')}
          hint={t('tasks.detail.notesHint')}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
        />
      ) : text.trim() ? (
        <Markdown source={text} className={s.markdown} />
      ) : (
        <p className={s.muted}>{t('tasks.detail.noNotes')}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Pomodoro history (2.6)                                                                      */
/* ------------------------------------------------------------------------------------------ */

const SESSION_MIN = engine.DEFAULT_POMODORO.focus;

export function PomodoroSection({ task }: { task: Task }) {
  const { t, fmt, now } = useTasks();
  const sessions = task.timeLogs.filter((l) => l.kind === 'focus');
  const total = engine.focusMinutes(task);
  const plan = task.estimateMin ? engine.pomodoroPlan(task.estimateMin) : null;

  const start = () => {
    navigate('today');
    window.dispatchEvent(new CustomEvent(FOCUS_START_EVENT, { detail: { taskId: task.id } }));
  };
  const log = () => {
    const end = now;
    store.update(
      'tasks',
      task.id,
      engine.logTimePatch(task, { start: end - SESSION_MIN * 60_000, end, kind: 'focus' }),
    );
  };

  return (
    <section className={s.section} aria-labelledby={`pomo-${task.id}`}>
      <header className={s.sectionHeader}>
        <h3 id={`pomo-${task.id}`} className={s.sectionTitle}>
          {t('tasks.pomodoro.history')}
        </h3>
        <Button size="sm" variant="secondary" iconStart={<IconPlay />} onClick={start}>
          {t('tasks.pomodoro.start')}
        </Button>
      </header>
      <div className={s.stats}>
        <span>
          <strong className={s.tabular}>{fmt.duration(total)}</strong>
          <span className={s.muted}>{t('tasks.fields.timeSpent')}</span>
        </span>
        <span>
          <strong className={s.tabular}>{sessions.length}</strong>
          <span className={s.muted}>{t('tasks.pomodoro.sessionsLabel')}</span>
        </span>
        {task.estimateMin !== undefined && (
          <span>
            <strong className={s.tabular}>{fmt.duration(task.estimateMin)}</strong>
            <span className={s.muted}>{t('tasks.fields.estimate')}</span>
          </span>
        )}
      </div>
      {plan && <p className={s.muted}>{t('tasks.pomodoro.planned', { count: plan.sessions })}</p>}
      {sessions.length === 0 ? (
        <p className={s.muted}>{t('tasks.pomodoro.noLogs')}</p>
      ) : (
        <ol className={s.sessions}>
          {[...sessions]
            .reverse()
            .slice(0, 8)
            .map((l) => {
              const minutes = (l.end - l.start) / 60_000;
              return (
                <li
                  key={`${l.start}-${l.end}`}
                  aria-label={t('tasks.pomodoro.sessionA11y', {
                    duration: fmt.duration(minutes, 'long'),
                    when: fmt.relativeDay(l.start, now),
                  })}
                >
                  <span>{fmt.relativeDay(l.start, now)}</span>
                  <span className={s.muted}>{fmt.timeRange(l.start, l.end)}</span>
                  <span className={s.tabular}>{fmt.duration(minutes, 'compact')}</span>
                </li>
              );
            })}
        </ol>
      )}
      <Button size="sm" variant="ghost" iconStart={<IconPlus />} onClick={log}>
        {t('tasks.pomodoro.logSession', { duration: fmt.duration(SESSION_MIN) })}
      </Button>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Place reminder (2.5) — needs the mobile shells                                              */
/* ------------------------------------------------------------------------------------------ */

export function GeoSection({ task }: { task: Task }) {
  const { t } = useTasks();
  return (
    <section className={s.section} aria-labelledby={`geo-${task.id}`}>
      <header className={s.sectionHeader}>
        <h3 id={`geo-${task.id}`} className={s.sectionTitle}>
          {t('tasks.geo.title')}
        </h3>
      </header>
      {task.geo ? (
        <p>
          {t('tasks.geo.when', { place: task.geo.label ?? `${task.geo.lat}, ${task.geo.lng}` })}
        </p>
      ) : null}
      <div className={s.geoNote}>
        <IconMapPin aria-hidden="true" />
        <p>{t('tasks.geo.soon')}</p>
      </div>
      <Button size="sm" variant="secondary" disabled iconStart={<IconMapPin />}>
        {t('tasks.geo.add')}
      </Button>
    </section>
  );
}
