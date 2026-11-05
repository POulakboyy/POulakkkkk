import { useMemo, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import {
  MINUTE,
  endOfDay,
  overlaps,
  scheduler,
  startOfDay,
  tasks as taskEngine,
  type Id,
  type Interval,
} from '@pouxis/core';
import { useAppPrefs } from '../../app/appPrefs.ts';
import { withViewTransition } from '../../design/view-transition.ts';
import { openCommandBar } from '../../features/command/index.tsx';
import {
  completeTask,
  focusController,
  reopenTask,
  setFocusExpanded,
  useFocus,
} from '../../features/focus/index.tsx';
import { useFormat, useT } from '../../i18n/index.ts';
import { store, useCollection, usePrefs } from '../../store/index.ts';
import {
  Badge,
  Button,
  EmptyState,
  IconPlus,
  IconSparkle,
  ProgressBar,
  toast,
} from '../../ui/index.ts';
import {
  addBuffers,
  applyPlacements,
  applyPropagation,
  moveEvent,
  scheduleTask,
} from './actions.ts';
import {
  bufferItems,
  dayItems,
  dayWindow,
  findOverrun,
  floatingTasks,
  focusMinutes,
  freeGaps,
  greetingPeriod,
  hourMarks,
  layoutLanes,
  overrunEnd,
  totalMinutes,
  type TimelineItem,
} from './model.ts';
import { BuffersNotice, MakerNotice, OverrunNotice } from './Notices.tsx';
import {
  energyFor,
  magnetizeDay,
  makerWarning,
  missingBuffers,
  overrunPreview,
  planDay,
  slotInGap,
  tomorrowOf,
} from './planner.ts';
import { Timeline, type Ghost } from './Timeline.tsx';
import s from './Today.module.css';
import { Tray } from './Tray.tsx';
import { useNow } from './useNow.ts';

/** Lets React render the store change before the view transition snapshots the new state. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Today: the day as a vertical visual timeline, the floating tasks waiting for a slot, and
 * the gentle nudges of the scheduling engine (overrun, buffers, maker time, WIP).
 */
export default function TodayView() {
  const t = useT();
  const f = useFormat();
  const prefs = usePrefs();
  const tasks = useCollection('tasks');
  const events = useCollection('events');
  const { chronotype } = useAppPrefs();
  const focus = useFocus();
  const now = useNow();
  const tz = prefs.timeZone;
  const dayStart = startOfDay(now, tz);

  const [landed, setLanded] = useState<ReadonlySet<Id>>(new Set());
  const [dismissed, setDismissed] = useState<ReadonlySet<Id>>(new Set());
  const dismiss = (id: Id) => setDismissed((prev) => new Set(prev).add(id));

  const day = useMemo(() => ({ start: dayStart, end: endOfDay(dayStart, tz) }), [dayStart, tz]);
  const energy = useMemo(
    () => energyFor(tasks, dayStart, prefs, chronotype),
    [tasks, dayStart, prefs, chronotype],
  );

  const items = useMemo(() => dayItems(tasks, events, day), [tasks, events, day]);
  const dayEvents = useMemo(() => events.filter((e) => overlaps(e, day)), [events, day]);
  const drafts = useMemo(
    () => (dismissed.has('buffers') ? [] : missingBuffers(dayEvents, prefs)),
    [dayEvents, prefs, dismissed],
  );
  const shown = useMemo(
    () => [...items, ...bufferItems(drafts)].sort((a, b) => a.start - b.start),
    [items, drafts],
  );
  const window = dayWindow(day, shown, prefs, tz, now);
  const lanes = useMemo(() => layoutLanes(shown), [shown]);
  const gaps = freeGaps(window, shown, now);
  const floating = useMemo(() => floatingTasks(tasks, day), [tasks, day]);

  const overrun = findOverrun(items, now, dismissed);
  const preview = useMemo(
    () => (overrun ? overrunPreview(tasks, events, overrun.id, overrunEnd(now), prefs) : undefined),
    [overrun, tasks, events, now, prefs],
  );
  const maker = useMemo(() => makerWarning(dayEvents, prefs, now), [dayEvents, prefs, now]);
  const wip = taskEngine.wipStatus(tasks, now, prefs, tz);
  const progress = scheduler.progress(now, window.work ?? 'day', tz);
  const ctx = { tasks, events, prefs, now, energy };

  const byId = new Map(shown.map((i) => [i.id, i]));
  // The overrunning block only shows its extension; what follows shows its new slot.
  const ghosts: Ghost[] = (preview?.moves ?? []).map((m) => ({
    id: m.id,
    start: m.id === overrun?.id ? overrun.end : m.start,
    end: m.end,
    title: byId.get(m.id)?.title ?? '',
  }));
  const followers = (preview?.moves ?? []).filter((m) => m.id !== overrun?.id);
  const ownMove = preview?.moves.find((m) => m.id === overrun?.id);
  const extendMin = overrun && ownMove ? Math.round((ownMove.end - overrun.end) / MINUTE) : 0;
  // Followers may slide by different amounts (free time absorbs part of the delay).
  const shiftMin = followers.reduce(
    (max, m) => Math.max(max, Math.round((m.start - (byId.get(m.id)?.start ?? m.start)) / MINUTE)),
    0,
  );

  const decayOfTask = (task: (typeof tasks)[number]) => taskEngine.decay(task, prefs, now);
  const decayOf = (item: TimelineItem) => (item.task ? decayOfTask(item.task) : undefined);

  /** Applies a placement inside a shared-element view transition, then lets blocks land. */
  const animate = (ids: Iterable<Id>, apply: () => void) => {
    void withViewTransition(async () => {
      apply();
      await settle();
      flushSync(() => setLanded(new Set(ids)));
    });
  };

  const undoAction = { label: t('common.undo'), onClick: () => store.undo() };

  const planMyDay = () => {
    const result = planDay(ctx);
    const unplaced = result.unplaced.filter((u) => u.reason !== 'blocked').length;
    if (result.placements.length === 0) {
      toast({
        title: t('today.plan.nothing'),
        ...(unplaced > 0 ? { description: t('today.plan.unplaced', { count: unplaced }) } : {}),
      });
      return;
    }
    animate(
      result.placements.map((p) => p.taskId),
      () => applyPlacements(store, result.placements, t('today.plan.action')),
    );
    toast({
      title: t('today.plan.done'),
      description: [
        t('today.plan.placed', { count: result.placements.length }),
        unplaced > 0 ? t('today.plan.unplaced', { count: unplaced }) : '',
      ]
        .filter(Boolean)
        .join(' · '),
      tone: 'success',
      action: undoAction,
    });
  };

  const placeOne = (taskId: Id) => {
    const slot = magnetizeDay(ctx).find((p) => p.taskId === taskId);
    if (!slot) {
      toast({ title: t('today.floating.noRoom') });
      return;
    }
    animate([taskId], () => scheduleTask(store, taskId, slot));
    toast({ title: t('today.floating.placed', { time: f.time(slot.start) }), action: undoAction });
  };

  const placeAll = () => {
    const suggestions = magnetizeDay(ctx);
    if (suggestions.length === 0) {
      toast({ title: t('today.floating.noRoomMany') });
      return;
    }
    animate(
      suggestions.map((p) => p.taskId),
      () => applyPlacements(store, suggestions, t('today.floating.placeAll')),
    );
    toast({
      title: t('today.floating.placedMany', { count: suggestions.length }),
      ...(suggestions.length < floating.length
        ? { description: t('today.floating.noRoomMany') }
        : {}),
      action: undoAction,
    });
  };

  const placeInGap = (taskId: Id, gap: Interval) => {
    const task = store.get('tasks', taskId);
    const slot = task && slotInGap(task, gap);
    if (!slot) {
      toast({ title: t('today.floating.noRoom') });
      return;
    }
    animate([taskId], () => scheduleTask(store, taskId, slot));
    toast({ title: t('today.floating.placed', { time: f.time(slot.start) }), action: undoAction });
  };

  const onGap = (gap: Interval) => {
    const fit = floating.find((task) => slotInGap(task, gap));
    if (fit) placeInGap(fit.id, gap);
    else openCommandBar();
  };

  const onToggle = (item: TimelineItem, done: boolean) => {
    const task = item.task;
    if (!task) return;
    if (!done) {
      reopenTask(store, task.id);
      return;
    }
    const controller = focusController();
    if (controller.getState().session?.taskId === task.id) controller.complete();
    else completeTask(store, task.id, Date.now());
  };

  const onFocus = (taskId: Id) => {
    focusController().start(taskId);
    setFocusExpanded(true);
  };

  const propagate = () => {
    if (!overrun || !preview) return;
    const moved = applyPropagation(
      store,
      overrun.id,
      preview.moves,
      preview.overflow,
      tomorrowOf(now, prefs),
      t('today.overrun.propagate'),
    );
    if (moved > 0) {
      toast({
        title: t('today.overrun.propagated', { count: moved, duration: f.duration(shiftMin) }),
        action: undoAction,
      });
    }
  };

  const wrapUp = () => {
    if (overrun?.task) completeTask(store, overrun.task.id, Date.now());
  };

  const addAllBuffers = () => {
    const count = addBuffers(store, drafts, t('today.buffers.add'));
    toast({ title: t('today.buffers.added', { count }), action: undoAction });
  };

  const scheduledToday = items.filter((i) => i.kind !== 'buffer');
  const openToday = scheduledToday.filter((i) => i.task && !i.done).length + floating.length;
  const doneToday = scheduledToday.filter((i) => i.done).length;
  const percent = f.percent(progress);
  const freeMin = totalMinutes(gaps);
  const isEmpty = scheduledToday.length === 0 && floating.length === 0;

  return (
    <div className={s.page} data-player={focus.session ? '' : undefined}>
      <header className={s.header}>
        <span className={s.watermark} aria-hidden="true">
          {Math.round(progress * 100)}
          <span className={s.watermarkUnit}>%</span>
        </span>
        <p className={s.eyebrow}>{f.date(now, 'weekdayDayMonth')}</p>
        <h1 className={`serif ${s.title}`}>{t(`today.greeting.${greetingPeriod(now, tz)}`)}</h1>
        <ul className={s.summary} aria-label={t('today.summary.a11y')}>
          <li>{t('today.summary.planned', { count: scheduledToday.length + floating.length })}</li>
          {window.work && <li>{t('today.summary.free', { duration: f.duration(freeMin) })}</li>}
          <li>{t('today.summary.focus', { duration: f.duration(focusMinutes(items)) })}</li>
          {wip.enabled && (
            <li>
              <Badge
                tone={wip.exceeded ? 'warning' : wip.atLimit ? 'accent' : 'neutral'}
                aria-label={t('today.wip.a11y', { count: wip.count, limit: wip.limit })}
              >
                {t('today.wip.label', { count: wip.count, limit: wip.limit })}
              </Badge>
            </li>
          )}
        </ul>
        {wip.exceeded && (
          <p className={s.wipNote}>{t('today.wip.exceeded', { limit: wip.limit })}</p>
        )}
        <div className={s.headerActions}>
          <Button
            variant="primary"
            iconStart={<IconSparkle size={18} />}
            onClick={planMyDay}
            aria-describedby="today-plan-hint"
          >
            {t('today.plan.action')}
          </Button>
          <p id="today-plan-hint" className={s.planHint}>
            {t('today.plan.hint')}
          </p>
        </div>
        <ProgressBar
          className={s.dayProgress}
          value={progress}
          size="sm"
          label={t('today.progress.label')}
          hideLabel
          valueText={t(window.work ? 'today.progress.a11y' : 'today.progress.dayA11y', {
            percent,
          })}
        />
      </header>

      <div className={s.layout}>
        <div className={s.rail}>
          {overrun && preview && (
            <OverrunNotice
              item={overrun}
              overMin={Math.round((now - overrun.end) / MINUTE)}
              extendMin={extendMin}
              moved={followers.length}
              overflow={preview.overflow.length}
              onPropagate={propagate}
              onWrapUp={wrapUp}
              onKeep={() => dismiss(overrun.id)}
            />
          )}
          {maker && !dismissed.has(`maker:${maker.event.id}`) && (
            <MakerNotice
              warning={maker}
              onMove={(slot) => moveEvent(store, maker.event.id, slot)}
              onKeep={() => dismiss(`maker:${maker.event.id}`)}
            />
          )}
          {drafts.length > 0 && (
            <BuffersNotice
              drafts={drafts}
              bufferMin={prefs.bufferMin}
              onAdd={addAllBuffers}
              onDismiss={() => dismiss('buffers')}
            />
          )}
          {!window.work && (
            <section className={s.notice}>
              <div className={s.noticeBody}>
                <h2 className={s.noticeTitle}>{t('today.dayOff.title')}</h2>
                <p className={s.noticeText}>{t('today.dayOff.body')}</p>
              </div>
            </section>
          )}
          {openToday === 0 && doneToday > 0 && (
            <section className={s.notice}>
              <span className={s.noticeIcon} aria-hidden="true">
                🌿
              </span>
              <div className={s.noticeBody}>
                <h2 className={s.noticeTitle}>{t('today.allDone.title')}</h2>
                <p className={s.noticeText}>{t('today.allDone.body')}</p>
              </div>
            </section>
          )}
          {isEmpty ? (
            <EmptyState
              size="compact"
              icon={<span className={s.emptyIcon}>☀️</span>}
              title={t('today.empty.title')}
              description={t('today.empty.body')}
              action={
                <Button iconStart={<IconPlus size={16} />} onClick={() => openCommandBar()}>
                  {t('today.empty.action')}
                </Button>
              }
            />
          ) : (
            <Tray
              tasks={floating}
              decayOf={decayOfTask}
              onPlace={placeOne}
              onPlaceAll={placeAll}
              onFocus={onFocus}
            />
          )}
          <EnergyLegend />
        </div>

        <Timeline
          window={window}
          hours={hourMarks(window, tz)}
          items={shown}
          lanes={lanes}
          gaps={gaps}
          ghosts={ghosts}
          energy={energy}
          now={now}
          landed={landed}
          focusTaskId={focus.session?.taskId}
          decayOf={decayOf}
          onToggle={onToggle}
          onFocus={onFocus}
          onGap={onGap}
          onDropTask={placeInGap}
          onRemoveBuffer={(id) => {
            store.remove('events', id);
            toast({ title: t('today.buffers.removed'), action: undoAction });
          }}
        />
      </div>
    </div>
  );
}

/** Legend of the sequential energy strip (one hue, light → dark). */
function EnergyLegend() {
  const t = useT();
  return (
    <section className={s.legend} aria-labelledby="today-energy-title">
      <h2 id="today-energy-title" className={s.railTitle}>
        {t('today.energy.label')}
      </h2>
      <div className={s.legendScale}>
        <span>{t('today.energy.low')}</span>
        <span className={s.legendRamp} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((n) => (
            <span key={n} data-heat={n} style={{ '--n': n } as CSSProperties} />
          ))}
        </span>
        <span>{t('today.energy.high')}</span>
      </div>
      <p className={s.muted}>{t('today.energy.hint')}</p>
    </section>
  );
}
