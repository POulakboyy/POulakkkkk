/**
 * Create / edit dialog. A new event can be typed in natural language first; meetings are
 * checked against the maker schedule (1.15) and offered transition buffers (1.6) live.
 */
import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  DAY,
  nlp,
  recurrence,
  type CalendarEvent,
  type EventKind,
  type Interval,
  type UserPrefs,
  scheduler,
} from '@pouxis/core';
import { useFormat, useT, type MessageKey } from '../../i18n/index.ts';
import {
  Button,
  Checkbox,
  Chip,
  Dialog,
  IconAlert,
  IconCopy,
  IconTrash,
  SegmentedControl,
  Switch,
  TextArea,
  TextField,
} from '../../ui/index.ts';
import { asEvent, expandEvents, ruleOf, type EventInstance } from './model/expand.ts';
import {
  EDITABLE_KINDS,
  formInterval,
  toDateInput,
  toTimeInput,
  type EventForm,
} from './model/form.ts';
import { reviewMeeting } from './model/guard.ts';
import s from './EventEditor.module.css';

export interface EditorTarget {
  /** The occurrence being edited; absent when creating. */
  instance?: EventInstance;
  form: EventForm;
}

export interface EditorSave {
  form: EventForm;
  interval: Interval;
  buffers: scheduler.EventDraft[];
}

export interface EventEditorProps {
  target: EditorTarget | null;
  events: readonly CalendarEvent[];
  prefs: UserPrefs;
  now: number;
  onClose: () => void;
  onSave: (save: EditorSave) => void;
  onDelete: (instance: EventInstance) => void;
  onDuplicate: (instance: EventInstance) => void;
  onCopyLink: (id: string) => void;
}

export function EventEditor(props: EventEditorProps) {
  const t = useT();
  const { target } = props;
  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title={t(target?.instance ? 'calendar.event.edit' : 'calendar.event.new')}
      size="md"
    >
      {target && (
        <EditorBody
          key={target.instance?.key ?? `new-${target.form.date}-${target.form.startTime}`}
          {...props}
          target={target}
        />
      )}
    </Dialog>
  );
}

function EditorBody({
  target,
  events,
  prefs,
  now,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  onCopyLink,
}: EventEditorProps & { target: EditorTarget }) {
  const t = useT();
  const f = useFormat();
  const { timeZone, locale } = prefs;
  const [form, setForm] = useState<EventForm>(target.form);
  const [quick, setQuick] = useState('');
  const [quickNote, setQuickNote] = useState<string | null>(null);
  const [attendee, setAttendee] = useState('');
  const [withBuffers, setWithBuffers] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const editing = target.instance;

  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const interval = formInterval(form, timeZone);
  const rule = form.recurrence.trim() ? ruleOf(form.recurrence.trim(), locale) : null;
  const ruleInvalid = form.recurrence.trim() !== '' && rule === null;

  const review = useMemo(() => {
    if (!interval) return null;
    const around = { start: interval.start - DAY, end: interval.end + DAY };
    const nearby = expandEvents(events, around, locale).map(asEvent);
    return reviewMeeting({
      candidate: { ...interval, ...(editing ? { id: editing.event.id } : {}) },
      kind: form.kind,
      events: nearby,
      prefs,
      now,
    });
  }, [interval?.start, interval?.end, form.kind, events, prefs, now, editing, locale]);

  const applyQuick = () => {
    const text = quick.trim();
    if (!text) return;
    const r = nlp.parse(text, { now, timeZone, locale });
    const next: EventForm = { ...form, title: r.title || form.title };
    if (r.start !== undefined) {
      const end = r.end ?? r.start + (r.durationMin ?? 60) * 60_000;
      next.date = toDateInput(r.start, timeZone);
      next.startTime = toTimeInput(r.start, timeZone);
      next.endTime = toTimeInput(end, timeZone);
      setQuickNote(
        t('calendar.event.parsed', {
          summary: `${f.relativeDay(r.start, now)}, ${f.timeRange(r.start, end)}`,
        }),
      );
    } else {
      setQuickNote(t('calendar.event.parsedNothing'));
    }
    if (r.attendees?.length) next.attendees = [...new Set([...form.attendees, ...r.attendees])];
    if (r.recurrence) next.recurrence = r.recurrence;
    if (r.location) next.location = r.location;
    if (r.attendees?.length) next.kind = 'meeting';
    setForm(next);
    setQuick('');
  };

  const onQuickKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyQuick();
    }
  };

  const addAttendee = () => {
    const name = attendee.trim().replace(/^@/, '');
    if (name && !form.attendees.includes(name)) set('attendees', [...form.attendees, name]);
    setAttendee('');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!interval || ruleInvalid) return;
    const buffers = withBuffers && review ? review.buffers : [];
    onSave({ form, interval, buffers });
  };

  const applyAlternative = (alt: Interval) => {
    setForm((p) => ({
      ...p,
      date: toDateInput(alt.start, timeZone),
      startTime: toTimeInput(alt.start, timeZone),
      endTime: toTimeInput(alt.end, timeZone),
    }));
  };

  const kindOptions = EDITABLE_KINDS.map((k) => ({
    value: k,
    label: t(`common.eventKind.${k}` as MessageKey),
  }));
  const bufferCount = review?.buffers.length ?? 0;

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      {!editing && (
        <TextField
          label={t('calendar.event.new')}
          hideLabel
          placeholder={t('calendar.event.quickPlaceholder')}
          hint={quickNote ?? t('calendar.event.quickHint')}
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={onQuickKey}
          onBlur={applyQuick}
          size="lg"
        />
      )}
      <TextField
        label={t('calendar.event.title')}
        placeholder={t('calendar.event.titlePlaceholder')}
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        autoFocus={Boolean(editing)}
      />
      <SegmentedControl<EventKind>
        label={t('calendar.event.kind')}
        options={kindOptions}
        value={form.kind === 'buffer' ? 'meeting' : form.kind}
        onChange={(v) => set('kind', v)}
        fullWidth
        size="sm"
        className={s.kinds}
      />
      <div className={s.when}>
        <TextField
          label={t('calendar.event.day')}
          type="date"
          value={form.date}
          onChange={(e) => set('date', e.target.value)}
          wrapperClassName={s.date}
        />
        <TextField
          label={t('calendar.event.starts')}
          type="time"
          step={300}
          value={form.startTime}
          onChange={(e) => set('startTime', e.target.value)}
        />
        <TextField
          label={t('calendar.event.ends')}
          type="time"
          step={300}
          value={form.endTime}
          onChange={(e) => set('endTime', e.target.value)}
          error={submitted && !interval ? t('calendar.event.endBeforeStart') : undefined}
        />
      </div>

      {review?.maker && !review.maker.ok && review.maker.code === 'fragments-maker-block' && (
        <section className={s.guard} aria-live="polite">
          <p className={s.guardTitle}>
            <IconAlert size={18} />
            {t('calendar.guard.title')}
          </p>
          <p className={s.guardBody}>{review.maker.message}</p>
          {review.alternatives.length > 0 && (
            <>
              <p className={s.guardLabel}>{t('calendar.guard.alternatives')}</p>
              <div className={s.alternatives}>
                {review.alternatives.map((alt) => (
                  <Button
                    key={alt.start}
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => applyAlternative(alt)}
                  >
                    {f.relativeDay(alt.start, now)} · {f.timeRange(alt.start, alt.end)}
                  </Button>
                ))}
              </div>
            </>
          )}
        </section>
      )}
      {bufferCount > 0 && (
        <Checkbox
          checked={withBuffers}
          onCheckedChange={setWithBuffers}
          label={t('calendar.guard.buffers', {
            count: bufferCount,
            duration: f.duration(prefs.bufferMin),
          })}
          description={t('calendar.guard.buffersHint')}
        />
      )}

      <TextField
        label={t('calendar.event.recurrence')}
        value={form.recurrence}
        onChange={(e) => set('recurrence', e.target.value)}
        hint={
          rule
            ? t('calendar.event.recurrenceParsed', {
                rule: recurrence.describe(rule, locale, { timeZone }),
              })
            : t('calendar.event.recurrenceHint')
        }
        error={
          ruleInvalid && (submitted || form.recurrence.length > 3)
            ? t('calendar.event.recurrenceInvalid')
            : undefined
        }
      />
      {editing?.recurring && <p className={s.note}>{t('calendar.event.series')}</p>}
      <TextField
        label={t('calendar.event.location')}
        value={form.location}
        onChange={(e) => set('location', e.target.value)}
      />
      <div className={s.attendees}>
        <TextField
          label={t('calendar.event.attendees')}
          placeholder={t('calendar.event.addAttendee')}
          value={attendee}
          onChange={(e) => setAttendee(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addAttendee();
            }
          }}
          onBlur={addAttendee}
        />
        {form.attendees.length > 0 && (
          <div className={s.chips}>
            {form.attendees.map((a) => (
              <Chip
                key={a}
                onRemove={() =>
                  set(
                    'attendees',
                    form.attendees.filter((x) => x !== a),
                  )
                }
                removeLabel={`${t('common.delete')} ${a}`}
              >
                @{a}
              </Chip>
            ))}
          </div>
        )}
      </div>
      <Switch
        label={t('calendar.event.fixed')}
        description={t('calendar.event.fixedHint')}
        checked={form.fixed}
        onCheckedChange={(v) => set('fixed', v)}
      />
      <TextArea
        label={t('calendar.event.notes')}
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        rows={3}
      />

      <div className={s.footer}>
        {editing && (
          <div className={s.secondary}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconStart={<IconCopy size={16} />}
              onClick={() => onCopyLink(editing.event.id)}
            >
              {t('calendar.deepLink.copy')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onDuplicate(editing)}>
              {t('common.actions.duplicate')}
            </Button>
            <Button
              type="button"
              variant="danger-soft"
              size="sm"
              iconStart={<IconTrash size={16} />}
              onClick={() => onDelete(editing)}
            >
              {t('common.delete')}
            </Button>
          </div>
        )}
        <div className={s.primary}>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary">
            {t(editing ? 'common.save' : 'calendar.event.create')}
          </Button>
        </div>
      </div>
    </form>
  );
}
