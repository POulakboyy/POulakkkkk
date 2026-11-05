import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { minutesOfDay, type Id, type Interval, type Timestamp } from '@pouxis/core';
import type { Decay } from '@pouxis/core/tasks';
import { useT, useFormat } from '../../i18n/index.ts';
import {
  Checkbox,
  IconButton,
  IconClose,
  IconPin,
  IconPlay,
  VisuallyHidden,
  cx,
} from '../../ui/index.ts';
import {
  energyWord,
  heatLevel,
  minutesFrom,
  type DayWindow,
  type Lane,
  type TimelineItem,
} from './model.ts';
import s from './Today.module.css';

/** A dashed preview of where an item would move (delay propagation). */
export interface Ghost extends Interval {
  id: Id;
  title: string;
}

export interface TimelineProps {
  window: DayWindow;
  hours: readonly Timestamp[];
  items: readonly TimelineItem[];
  lanes: ReadonlyMap<Id, Lane>;
  gaps: readonly Interval[];
  ghosts: readonly Ghost[];
  energy: readonly number[] | undefined;
  now: Timestamp;
  /** Tasks just placed by "Plan my day" / magnetize: they land with a short animation. */
  landed: ReadonlySet<Id>;
  focusTaskId: Id | undefined;
  decayOf: (item: TimelineItem) => Decay | undefined;
  onToggle: (item: TimelineItem, done: boolean) => void;
  onFocus: (taskId: Id) => void;
  onGap: (gap: Interval) => void;
  onDropTask: (taskId: Id, gap: Interval) => void;
  onRemoveBuffer: (eventId: Id) => void;
}

/** MIME type of a task dragged from the floating tray. */
export const TASK_DRAG_TYPE = 'application/x-pouxis-task';

/** Valid `view-transition-name` for a task, shared by its tray card and its timeline block. */
export function transitionName(taskId: Id): string {
  return `today-task-${taskId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

const pos = (window: Interval, i: Interval): CSSProperties =>
  ({
    '--m': minutesFrom(window, i.start),
    '--d': (i.end - i.start) / 60_000,
  }) as CSSProperties;

/**
 * Tiimo-like vertical day: hour rail, energy strip, colour blocks, free gaps that accept
 * dropped tasks, and the live "now" line.
 */
export function Timeline(props: TimelineProps) {
  const { window, hours, items, lanes, gaps, ghosts, energy, now } = props;
  const t = useT();
  const f = useFormat();
  const nowRef = useRef<HTMLDivElement>(null);
  const nowVisible = now >= window.start && now <= window.end;

  useEffect(() => {
    const el = nowRef.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    if (el.getBoundingClientRect().top > globalThis.innerHeight - 80) {
      el.scrollIntoView({ block: 'center' });
    }
    // Only on mount: never fight the user's own scrolling.
  }, []);

  const minutes = minutesFrom(window, window.end);

  return (
    <section className={s.timeline} aria-labelledby="today-timeline-title">
      <VisuallyHidden>
        <h2 id="today-timeline-title">{t('today.timeline.label')}</h2>
      </VisuallyHidden>
      <div className={s.grid} style={{ '--span': minutes } as CSSProperties}>
        <ol className={s.hours} aria-hidden="true">
          {hours.map((h) => (
            <li
              key={h}
              className={cx(s.hour, nowVisible && Math.abs(h - now) < 15 * 60_000 && s.hourHidden)}
              style={pos(window, { start: h, end: h })}
            >
              <span className={s.hourLabel}>{f.time(h)}</span>
            </li>
          ))}
        </ol>

        {energy && <EnergyStrip window={window} hours={hours} energy={energy} />}

        <div className={s.track}>
          {window.work && <OffHours window={window} work={window.work} />}

          {/* One chronological list: Tab walks the day in time order (WCAG 2.4.3). */}
          <ol className={s.blocks} aria-label={t('today.timeline.label')}>
            {chronological(items, gaps).map((entry) =>
              entry.kind === 'gap' ? (
                <Gap
                  key={`gap-${entry.gap.start}`}
                  window={window}
                  gap={entry.gap}
                  onGap={props.onGap}
                  onDrop={props.onDropTask}
                />
              ) : (
                <Block
                  key={entry.item.id}
                  item={entry.item}
                  window={window}
                  lane={lanes.get(entry.item.id)}
                  now={now}
                  landed={props.landed.has(entry.item.task?.id ?? entry.item.id)}
                  focused={
                    entry.item.task !== undefined && entry.item.task.id === props.focusTaskId
                  }
                  decay={props.decayOf(entry.item)}
                  onToggle={props.onToggle}
                  onFocus={props.onFocus}
                  onRemoveBuffer={props.onRemoveBuffer}
                />
              ),
            )}
          </ol>

          {ghosts.map((g) => (
            <div key={g.id} className={s.ghost} style={pos(window, g)} aria-hidden="true">
              <span>{g.title}</span>
              <span className={s.ghostTime}>{f.timeRange(g.start, g.end)}</span>
            </div>
          ))}
        </div>

        {nowVisible && (
          <div
            ref={nowRef}
            className={s.now}
            style={{ '--m': minutesFrom(window, now) } as CSSProperties}
            role="img"
            aria-label={t('today.timeline.nowA11y', { time: f.time(now) })}
          >
            <span className={s.nowLabel}>{f.time(now)}</span>
          </div>
        )}
      </div>
    </section>
  );
}

type TrackEntry =
  | { kind: 'gap'; start: Timestamp; gap: Interval }
  | { kind: 'item'; start: Timestamp; item: TimelineItem };

/** Blocks and free gaps merged by start time (stable: blocks keep their lane order). */
export function chronological(
  items: readonly TimelineItem[],
  gaps: readonly Interval[],
): TrackEntry[] {
  const entries: TrackEntry[] = [
    ...items.map((item) => ({ kind: 'item' as const, start: item.start, item })),
    ...gaps.map((gap) => ({ kind: 'gap' as const, start: gap.start, gap })),
  ];
  return entries.sort((a, b) => a.start - b.start);
}

function OffHours({ window, work }: { window: Interval; work: Interval }) {
  const t = useT();
  const zones = [
    { start: window.start, end: Math.min(work.start, window.end) },
    { start: Math.max(work.end, window.start), end: window.end },
  ].filter((z) => z.end > z.start);
  return zones.map((z) => (
    <div
      key={z.start}
      className={s.offHours}
      style={pos(window, z)}
      title={t('today.timeline.outsideHours')}
      aria-hidden="true"
    />
  ));
}

function EnergyStrip(props: {
  window: Interval;
  hours: readonly Timestamp[];
  energy: readonly number[];
}) {
  const t = useT();
  const f = useFormat();
  const cells = props.hours.slice(0, -1).map((h) => {
    const value = props.energy[Math.floor(minutesOfDay(h, f.timeZone) / 60)] ?? 0;
    const level = heatLevel(value);
    const word = t(`today.energy.${energyWord(level)}`);
    return { h, level, label: t('today.energy.hour', { time: f.time(h), level: word }) };
  });
  return (
    <ul className={s.energy} aria-label={t('today.energy.label')}>
      {cells.map((c) => (
        <li
          key={c.h}
          className={s.energyCell}
          data-heat={c.level}
          style={pos(props.window, { start: c.h, end: c.h + 3_600_000 })}
          title={c.label}
        >
          <VisuallyHidden>{c.label}</VisuallyHidden>
        </li>
      ))}
    </ul>
  );
}

function Gap(props: {
  window: Interval;
  gap: Interval;
  onGap: (gap: Interval) => void;
  onDrop: (taskId: Id, gap: Interval) => void;
}) {
  const t = useT();
  const f = useFormat();
  const [over, setOver] = useState(false);
  const minutes = Math.round((props.gap.end - props.gap.start) / 60_000);
  const accepts = (e: DragEvent) => e.dataTransfer.types.includes(TASK_DRAG_TYPE);

  return (
    <li className={s.gapItem} style={pos(props.window, props.gap)}>
      <button
        type="button"
        className={cx(s.gap, over && s.gapOver)}
        onClick={() => props.onGap(props.gap)}
        onDragOver={(e) => {
          if (!accepts(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          setOver(false);
          const id = e.dataTransfer.getData(TASK_DRAG_TYPE);
          if (!id) return;
          e.preventDefault();
          props.onDrop(id, props.gap);
        }}
        aria-label={`${t('today.timeline.freeSlot', { duration: f.duration(minutes) })}, ${f.timeRange(props.gap.start, props.gap.end)}. ${t('today.timeline.freeSlotHint')}`}
      >
        <span className={s.gapLabel}>
          {t('today.timeline.freeSlot', { duration: f.duration(minutes) })}
        </span>
      </button>
    </li>
  );
}

interface BlockProps {
  item: TimelineItem;
  window: Interval;
  lane: Lane | undefined;
  now: Timestamp;
  landed: boolean;
  focused: boolean;
  decay: Decay | undefined;
  onToggle: (item: TimelineItem, done: boolean) => void;
  onFocus: (taskId: Id) => void;
  onRemoveBuffer: (eventId: Id) => void;
}

function Block({ item, window, lane, now, landed, focused, decay, ...on }: BlockProps) {
  const t = useT();
  const f = useFormat();
  const minutes = (item.end - item.start) / 60_000;
  const range = f.timeRange(item.start, item.end);
  const task = item.task;
  const open = task !== undefined && !item.done;
  const aging = decay && decay.state !== 'fresh';
  const style = {
    ...pos(window, item),
    '--lane': lane?.lane ?? 0,
    '--lanes': lane?.lanes ?? 1,
    '--decay': aging ? decay.level : 0,
    ...(task && !item.virtual ? { viewTransitionName: transitionName(task.id) } : {}),
  } as CSSProperties;

  return (
    <li
      className={cx(
        s.block,
        minutes < 40 && s.compact,
        item.kind === 'buffer' && s.buffer,
        item.virtual && s.virtual,
        item.done && s.done,
        item.end <= now && !item.done && s.past,
        landed && s.landed,
        focused && s.focused,
        aging && s.aging,
      )}
      data-cat={item.color}
      data-shared={(lane?.lanes ?? 1) > 1 ? '' : undefined}
      style={style}
    >
      <span className={s.blockIcon} aria-hidden="true">
        {item.icon}
      </span>
      <span className={s.blockText}>
        <span className={s.blockTitle}>{item.title}</span>
        <span className={s.blockMeta}>
          <span>{range}</span>
          {item.fixed && item.kind === 'event' && (
            <span className={s.metaTag} title={t('today.timeline.fixedHint')}>
              <IconPin size={12} aria-hidden="true" />
              <span className={s.tagText}>{t('today.timeline.fixed')}</span>
            </span>
          )}
          {item.virtual && <span className={s.metaTag}>{t('today.buffers.suggested')}</span>}
          {aging && (
            <span className={s.metaTag}>
              {t(decay.state === 'stale' ? 'today.decay.stale' : 'today.decay.aging')}
            </span>
          )}
        </span>
      </span>
      <span className={s.blockActions}>
        {open && !focused && (
          <IconButton
            size="sm"
            label={t('today.focus.startOn', { title: item.title })}
            icon={<IconPlay size={16} />}
            onClick={() => on.onFocus(task.id)}
          />
        )}
        {item.kind === 'buffer' && !item.virtual && (
          <IconButton
            size="sm"
            label={t('today.buffers.remove')}
            icon={<IconClose size={16} />}
            onClick={() => on.onRemoveBuffer(item.id)}
          />
        )}
        {task && (
          <Checkbox
            shape="circle"
            checked={item.done}
            onCheckedChange={(done) => on.onToggle(item, done)}
            aria-label={t('today.timeline.blockA11y', {
              title: item.title,
              start: f.time(item.start),
              end: f.time(item.end),
            })}
          />
        )}
      </span>
    </li>
  );
}
