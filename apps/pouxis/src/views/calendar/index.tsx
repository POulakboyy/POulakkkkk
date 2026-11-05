/**
 * Calendar view: day and week grids with direct manipulation, month overview and the time
 * spiral, plus optional layers (energy, collaborator zones, progress, planned vs actual).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  insights,
  scheduler,
  startOfWeek,
  type Interval,
  type Timestamp,
} from '@pouxis/core';
import { navigate, useRoute } from '../../app/router.ts';
import { useFormat, useT, type MessageKey } from '../../i18n/index.ts';
import { store, useCollection, usePrefs } from '../../store/index.ts';
import {
  Button,
  IconButton,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  Pill,
  PillGroup,
  SegmentedControl,
  toast,
  useHotkeys,
} from '../../ui/index.ts';
import { EventEditor, type EditorSave, type EditorTarget } from './EventEditor.tsx';
import { MonthGrid } from './MonthGrid.tsx';
import { EnergyLegend, ProgressStrip, SnapshotPanel, ZonesPanel } from './Panels.tsx';
import { SpiralView } from './SpiralView.tsx';
import { TimeGrid } from './TimeGrid.tsx';
import { eventLink } from './model/deepLink.ts';
import { asEvent, expandEvents, type EventInstance } from './model/expand.ts';
import { eventFields, formFromInstance, formFromInterval, retimeSeries } from './model/form.ts';
import { reviewMeeting } from './model/guard.ts';
import {
  CALENDAR_MODES,
  isoWeek,
  spanOf,
  stepAnchor,
  visibleDays,
  type CalendarMode,
} from './model/range.ts';
import { ghosts, loadSnapshot, planItems, saveSnapshot, summarize } from './model/snapshots.ts';
import { OVERLAYS, useCalendarPrefs, useNow } from './useCalendar.ts';
import s from './Calendar.module.css';

const HIGHLIGHT_MS = 4_000;

export default function CalendarView() {
  const t = useT();
  const f = useFormat();
  const prefs = usePrefs();
  const { timeZone, locale } = prefs;
  const now = useNow();
  const route = useRoute();
  const events = useCollection('events');
  const tasks = useCollection('tasks');
  const cal = useCalendarPrefs();
  const { mode } = cal;
  const [anchor, setAnchor] = useState<Timestamp>(() => Date.now());
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [highlight, setHighlight] = useState<string | undefined>();
  const [snapshotVersion, setSnapshotVersion] = useState(0);

  const days = useMemo(() => visibleDays(anchor, mode, timeZone), [anchor, mode, timeZone]);
  const range = useMemo(() => spanOf(days, timeZone), [days, timeZone]);
  const instances = useMemo(() => expandEvents(events, range, locale), [events, range, locale]);

  // Energy changes slowly: recompute at most hourly.
  const hourNow = Math.floor(now / 3_600_000) * 3_600_000;
  const heatmap = useMemo(
    () => (cal.overlays.energy ? insights.energyHeatmap({ tasks, now: hourNow, timeZone }) : null),
    [cal.overlays.energy, tasks, hourNow, timeZone],
  );

  const weekStart = startOfWeek(anchor, timeZone);
  const snapshot = useSnapshot(weekStart, cal.overlays.snapshot, snapshotVersion);
  const comparison = useMemo(() => {
    if (!snapshot) return null;
    const week = { start: weekStart, end: addDays(weekStart, 7, timeZone) };
    const items = planItems(expandEvents(events, week, locale), tasks, week, timeZone);
    const diff = scheduler.compareSnapshots(snapshot, scheduler.snapshot(items, now));
    return { summary: summarize(snapshot, diff), ghosts: ghosts(snapshot, diff) };
  }, [snapshot, weekStart, events, tasks, locale, timeZone, now]);

  // Deep link `pouxis://event/<id>` → `#/calendar?event=<id>` (1.13).
  const linked = route.params.get('event');
  useEffect(() => {
    if (!linked) return;
    const target = store.get('events', linked);
    navigate('calendar');
    if (!target) {
      toast({ title: t('calendar.deepLink.openFailed'), tone: 'danger' });
      return;
    }
    setAnchor(target.start);
    if (mode === 'month' || mode === 'spiral') cal.setMode('week');
    setHighlight(target.id);
    // Runs once per incoming link.
  }, [linked]);
  useEffect(() => {
    if (!highlight) return;
    const id = setTimeout(() => setHighlight(undefined), HIGHLIGHT_MS);
    return () => clearTimeout(id);
  }, [highlight]);

  const step = (dir: 1 | -1) => setAnchor((a) => stepAnchor(a, mode, dir, timeZone));
  const goToday = () => setAnchor(Date.now());
  const newEvent = (interval?: Interval) => {
    const start = interval?.start ?? nextHalfHour(now);
    setEditor({ form: formFromInterval(interval ?? { start, end: start + 3_600_000 }, timeZone) });
  };
  const openInstance = (instance: EventInstance) => {
    if (instance.event.kind === 'buffer') return;
    setEditor({ instance, form: formFromInstance(instance, timeZone) });
  };

  useHotkeys(
    {
      n: () => newEvent(),
      t: goToday,
    },
    { enabled: editor === null },
  );

  const undoAction = { label: t('common.undo'), onClick: () => store.undo() };

  const save = ({ form, interval, buffers }: EditorSave) => {
    const source = editor?.instance;
    store.batch(() => {
      const fields = eventFields(form, interval, timeZone, source);
      if (source) store.update('events', source.event.id, fields);
      else store.create('events', { ...fields, tags: [] });
      for (const draft of buffers) store.create('events', draft);
    }, t('calendar.event.create'));
    setEditor(null);
    const title = source
      ? t('calendar.toast.updated')
      : t('calendar.toast.created', { when: f.relativeDay(interval.start, now) });
    const description =
      buffers.length > 0 ? t('calendar.toast.buffers', { count: buffers.length }) : undefined;
    toast({ title, description, tone: 'success', action: undoAction });
  };

  const retime = (instance: EventInstance, interval: Interval) => {
    const { event } = instance;
    if (interval.start === instance.start && interval.end === instance.end) return;
    const resized = interval.end - interval.start !== instance.end - instance.start;
    store.update('events', event.id, retimeSeries(instance, interval.start, interval.end));
    const review = reviewMeeting({
      candidate: { ...interval, id: event.id },
      kind: event.kind,
      events: expandEvents(
        events,
        { start: interval.start - 86_400_000, end: interval.end + 86_400_000 },
        locale,
      ).map(asEvent),
      prefs,
      now,
    });
    const broken =
      review.maker && !review.maker.ok && review.maker.code === 'fragments-maker-block';
    toast({
      title: resized
        ? t('calendar.toast.resized', {
            duration: f.duration((interval.end - interval.start) / 60_000),
          })
        : t('calendar.toast.moved', {
            time: `${f.relativeDay(interval.start, now)}, ${f.time(interval.start)}`,
          }),
      description: broken
        ? `${t('calendar.guard.title')}. ${review.maker?.message ?? ''}`
        : undefined,
      tone: broken ? 'warning' : 'neutral',
      action: undoAction,
    });
  };

  const remove = (instance: EventInstance) => {
    store.remove('events', instance.event.id);
    setEditor(null);
    toast({ title: t('calendar.toast.deleted'), action: undoAction });
  };

  const duplicate = (instance: EventInstance) => {
    const form = formFromInstance(instance, timeZone);
    setEditor({ form: { ...form, recurrence: '' } });
  };

  const copyLink = (id: string) => {
    const link = eventLink(id);
    const fail = () =>
      toast({
        title: t('calendar.deepLink.copyFailed', { link }),
        tone: 'danger',
        duration: 10_000,
      });
    if (!navigator.clipboard) return fail();
    navigator.clipboard.writeText(link).then(
      () =>
        toast({
          title: t('calendar.deepLink.copied'),
          description: t('calendar.deepLink.copiedHint'),
          tone: 'success',
        }),
      fail,
    );
  };

  const takeSnapshot = () => {
    const week = { start: weekStart, end: addDays(weekStart, 7, timeZone) };
    const items = planItems(expandEvents(events, week, locale), tasks, week, timeZone);
    saveSnapshot(weekStart, scheduler.snapshot(items, Date.now()));
    setSnapshotVersion((v) => v + 1);
    toast({ title: t('calendar.snapshot.taken'), tone: 'success' });
  };

  const heading = headingFor(mode, anchor, days, f, t);
  const isGrid = mode === 'day' || mode === 'week';
  const empty = isGrid && instances.length === 0;

  return (
    <div className={s.view}>
      <header className={s.header}>
        <div className={s.titles}>
          <p className={s.eyebrow}>{heading.eyebrow}</p>
          <h1 className={`serif ${s.title}`} aria-live="polite">
            {heading.title}
          </h1>
        </div>
        <Button
          variant="primary"
          iconStart={<IconPlus size={18} />}
          onClick={() => newEvent()}
          className={s.newButton}
        >
          {t('calendar.event.new')}
        </Button>
        <IconButton
          label={t('calendar.event.new')}
          icon={<IconPlus size={22} />}
          variant="primary"
          onClick={() => newEvent()}
          className={s.newIcon}
        />
      </header>

      <div className={`${s.toolbar} px-chrome`}>
        <div className={s.nav}>
          <IconButton
            label={t(navLabel(mode, -1))}
            icon={<IconChevronLeft size={20} />}
            variant="ghost"
            onClick={() => step(-1)}
            disabled={mode === 'spiral'}
          />
          <Button variant="secondary" size="sm" onClick={goToday}>
            {t('calendar.nav.today')}
          </Button>
          <IconButton
            label={t(navLabel(mode, 1))}
            icon={<IconChevronRight size={20} />}
            variant="ghost"
            onClick={() => step(1)}
            disabled={mode === 'spiral'}
          />
        </div>
        <SegmentedControl<CalendarMode>
          label={t('calendar.views.label')}
          options={CALENDAR_MODES.map((m) => ({ value: m, label: t(`calendar.views.${m}`) }))}
          value={mode}
          onChange={cal.setMode}
          size="sm"
          className={s.modes}
        />
        <PillGroup label={t('calendar.overlays.label')} className={s.overlays} wrap>
          {OVERLAYS.map((o) => (
            <Pill
              key={o}
              size="sm"
              selected={cal.overlays[o]}
              onSelectedChange={(on) => cal.toggleOverlay(o, on)}
              disabled={!isGrid && (o === 'zones' || o === 'energy')}
            >
              {t(`calendar.overlays.${o}`)}
            </Pill>
          ))}
        </PillGroup>
      </div>

      {cal.overlays.progress && <ProgressStrip now={now} timeZone={timeZone} />}
      <div className={s.panels}>
        {isGrid && cal.overlays.zones && (
          <ZonesPanel
            zones={cal.zones}
            timeZone={timeZone}
            day={days[0] ?? now}
            now={now}
            workingHours={prefs.workingHours}
            onAdd={cal.addZone}
            onRemove={cal.removeZone}
          />
        )}
        {isGrid && heatmap && <EnergyLegend heatmap={heatmap} />}
        {cal.overlays.snapshot && mode !== 'spiral' && (
          <SnapshotPanel
            takenAt={snapshot?.takenAt ?? null}
            summary={comparison?.summary ?? null}
            onTake={takeSnapshot}
          />
        )}
      </div>

      {empty && (
        <p className={s.emptyNote}>
          <strong>{t(`calendar.empty.${mode as 'day' | 'week'}.title`)}</strong>{' '}
          {t(`calendar.empty.${mode as 'day' | 'week'}.body`)}
        </p>
      )}

      <div className="px-fade-in" key={mode}>
        {isGrid && (
          <TimeGrid
            days={days}
            timeZone={timeZone}
            instances={instances}
            now={now}
            workingHours={prefs.workingHours}
            zones={cal.overlays.zones ? cal.zones : []}
            heatmap={heatmap}
            ghosts={cal.overlays.snapshot ? (comparison?.ghosts ?? []) : []}
            highlightId={highlight}
            onCreate={newEvent}
            onOpen={openInstance}
            onRetime={retime}
            onDelete={remove}
          />
        )}
        {mode === 'month' && (
          <MonthGrid
            days={days}
            anchor={anchor}
            now={now}
            timeZone={timeZone}
            instances={instances}
            onOpenDay={(day) => {
              setAnchor(day);
              cal.setMode('day');
            }}
            onOpenEvent={openInstance}
          />
        )}
        {mode === 'spiral' && (
          <SpiralView
            events={events}
            now={now}
            timeZone={timeZone}
            locale={locale}
            span={cal.spiralSpan}
            onSpanChange={cal.setSpiralSpan}
            onOpen={openInstance}
          />
        )}
      </div>

      <EventEditor
        target={editor}
        events={events}
        prefs={prefs}
        now={now}
        onClose={() => setEditor(null)}
        onSave={save}
        onDelete={remove}
        onDuplicate={duplicate}
        onCopyLink={copyLink}
      />
    </div>
  );
}

function useSnapshot(weekStart: Timestamp, enabled: boolean, version: number) {
  return useMemo(
    () => (enabled ? loadSnapshot(weekStart) : null),
    // `version` bumps after a snapshot is saved.
    [weekStart, enabled, version],
  );
}

function nextHalfHour(now: Timestamp): Timestamp {
  const step = 30 * 60_000;
  return Math.ceil(now / step) * step;
}

function navLabel(mode: CalendarMode, dir: 1 | -1): MessageKey {
  const unit = mode === 'day' ? 'Day' : mode === 'month' ? 'Month' : 'Week';
  return `calendar.nav.${dir === 1 ? 'next' : 'previous'}${unit}` as MessageKey;
}

function headingFor(
  mode: CalendarMode,
  anchor: Timestamp,
  days: readonly Timestamp[],
  f: ReturnType<typeof useFormat>,
  t: ReturnType<typeof useT>,
): { eyebrow: string; title: string } {
  const capital = (text: string) => text.charAt(0).toLocaleUpperCase(f.locale) + text.slice(1);
  if (mode === 'day')
    return {
      eyebrow: capital(f.relativeDay(anchor)),
      title: capital(f.date(anchor, 'weekdayDayMonth')),
    };
  if (mode === 'spiral')
    return { eyebrow: t('calendar.views.spiralHint'), title: t('calendar.spiral.label') };
  const first = days[0] ?? anchor;
  if (mode === 'month')
    return { eyebrow: t('calendar.title'), title: capital(f.date(anchor, 'monthYear')) };
  return {
    eyebrow: t('calendar.nav.weekNumber', { number: isoWeek(first, f.timeZone) }),
    title: capital(f.date(first + 3 * 86_400_000, 'monthYear')),
  };
}
