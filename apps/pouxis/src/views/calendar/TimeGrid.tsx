/**
 * Day and week grids: hour rows, one column per local day, events laid out in lanes. Events
 * are created, moved and resized by pointer (see `useGridDrag`) or keyboard (`keyCommand`).
 * Optional layers: collaborator time zones (1.5), energy rail (1.3), plan ghosts (1.9).
 */
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  addDays,
  atMinutes,
  insights,
  isSameDay,
  minutesOfDay,
  scheduler,
  weekday,
  zonedParts,
  type Interval,
  type TimeZone,
  type Timestamp,
  type WorkingHours,
} from '@pouxis/core';
import { useFormat, useT } from '../../i18n/index.ts';
import { IconPin, IconRepeat, VisuallyHidden, cx } from '../../ui/index.ts';
import { categoryFill } from './model/colors.ts';
import {
  applyGesture,
  keyCommand,
  minutesAt,
  slotInterval,
  snap,
  type Slot,
} from './model/drag.ts';
import type { EventInstance } from './model/expand.ts';
import { heatForWeekday } from './model/heat.ts';
import { DAY_MINUTES, daySpan, layoutDay, type PlacedInstance } from './model/layout.ts';
import { formatOffset, offsetFrom, sharedWindow, zoneCity, zoneHours } from './model/zones.ts';
import { useGridDrag } from './useGridDrag.ts';
import s from './TimeGrid.module.css';

export const HOUR_PX = 48;
const KEY_STEP_MIN = 30;

export interface TimeGridProps {
  days: readonly Timestamp[];
  timeZone: TimeZone;
  instances: readonly EventInstance[];
  now: Timestamp;
  workingHours: WorkingHours;
  zones: readonly TimeZone[];
  heatmap: insights.EnergyHeatmap | null;
  ghosts: readonly scheduler.SnapshotEntry[];
  /** Event whose occurrences are scrolled to and outlined (deep link). */
  highlightId?: string;
  onCreate: (interval: Interval) => void;
  onOpen: (instance: EventInstance) => void;
  onRetime: (instance: EventInstance, interval: Interval) => void;
  onDelete: (instance: EventInstance) => void;
}

export function TimeGrid(props: TimeGridProps) {
  const { days, timeZone, instances, now, zones, heatmap, ghosts } = props;
  const t = useT();
  const f = useFormat();
  const hintId = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const columns = useRef<(HTMLDivElement | null)[]>([]);
  const [cursor, setCursor] = useState<{ day: number; min: number } | null>(null);
  const [announce, setAnnounce] = useState('');

  const placed = useMemo(
    () => days.map((day) => layoutDay(instances, day, dayAfter(day, timeZone), timeZone)),
    [days, instances, timeZone],
  );
  const byKey = useMemo(() => {
    const map = new Map<string, { item: PlacedInstance; day: number }>();
    placed.forEach((items, day) =>
      items.forEach((item) => map.set(item.instance.key, { item, day })),
    );
    return map;
  }, [placed]);

  const columnAt = (clientX: number) => {
    const rects = columns.current.map((c) => c?.getBoundingClientRect());
    const index = rects.findIndex((r) => r && clientX < r.right);
    return index === -1 ? days.length - 1 : index;
  };
  const minuteAt = (clientY: number) => {
    const top = columns.current[0]?.getBoundingClientRect().top ?? 0;
    return minutesAt(clientY - top, HOUR_PX);
  };
  const retimeTo = (key: string, slot: Slot) => {
    const hit = byKey.get(key);
    const interval = slotInterval(slot, days, timeZone);
    if (hit && interval) props.onRetime(hit.item.instance, interval);
  };
  const drawTo = (slot: Slot) => {
    const interval = slotInterval(slot, days, timeZone);
    if (interval) props.onCreate(interval);
  };
  const drag = useGridDrag({
    dayCount: days.length,
    hourHeight: HOUR_PX,
    columnAt,
    minuteAt,
    onMove: retimeTo,
    onDraw: drawTo,
  });

  // Open on the working morning (or the deep-linked event) rather than at midnight.
  const initialMin = useMemo(() => {
    const hit = props.highlightId
      ? placed.flat().find((p) => p.instance.event.id === props.highlightId)
      : undefined;
    if (hit) return hit.top - 60;
    // Today during working hours: keep "now" in view; otherwise start the working day.
    const nowMin = minutesOfDay(now, timeZone);
    const { start, end } = props.workingHours;
    const working =
      days.some((d) => isSameDay(d, now, timeZone)) && nowMin >= start && nowMin < end;
    return working ? nowMin - 120 : start - 60;
    // Only on mount and when the visible days or the target change.
  }, [days[0], props.highlightId]);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = Math.max(0, (initialMin / 60) * HOUR_PX);
    // Narrow screens scroll the week sideways: bring today's column next to the hours.
    const today = days.findIndex((d) => isSameDay(d, now, timeZone));
    const first = columns.current[0];
    const column = columns.current[today];
    if (el.scrollWidth > el.clientWidth && first && column) {
      el.scrollLeft = column.offsetLeft - first.offsetLeft;
    }
  }, [initialMin, days[0]]);

  useEffect(() => {
    if (cursor && cursor.day >= days.length) setCursor(null);
  }, [cursor, days.length]);

  const sharedWindows = useMemo(
    () =>
      zones.length === 0
        ? []
        : days.map((day) =>
            sharedWindow(
              { start: day, end: dayAfter(day, timeZone) },
              [timeZone, ...zones],
              props.workingHours,
            ),
          ),
    [days, zones, timeZone, props.workingHours],
  );

  const onEventKey = (e: KeyboardEvent, item: PlacedInstance, day: number) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      props.onDelete(item.instance);
      return;
    }
    const cmd = keyCommand(e.key, e);
    if (!cmd || item.clippedStart || item.clippedEnd) return;
    e.preventDefault();
    const origin = { day, startMin: item.top, endMin: item.top + item.height };
    const slot = applyGesture(cmd.gesture, origin, cmd.deltaMin, cmd.deltaDay, days.length);
    retimeTo(item.instance.key, slot);
    const interval = slotInterval(slot, days, timeZone);
    if (interval) setAnnounce(f.timeRange(interval.start, interval.end));
    // Keep focus on the event when it changes column.
    if (slot.day !== day) requestAnimationFrame(() => focusEvent(item.instance.key));
  };

  const focusEvent = (key: string) => {
    scroller.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus();
  };

  const onColumnKey = (e: KeyboardEvent, day: number) => {
    if (e.target !== e.currentTarget) return;
    const current =
      cursor?.day === day ? cursor.min : defaultCursor(now, props.workingHours, timeZone);
    let next = { day, min: current };
    if (e.key === 'ArrowDown')
      next.min = Math.min(DAY_MINUTES - KEY_STEP_MIN, current + KEY_STEP_MIN);
    else if (e.key === 'ArrowUp') next.min = Math.max(0, current - KEY_STEP_MIN);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const target = day + (e.key === 'ArrowLeft' ? -1 : 1);
      if (target < 0 || target >= days.length) return;
      next = { day: target, min: current };
      columns.current[target]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      drawTo({ day, startMin: current, endMin: Math.min(DAY_MINUTES, current + 60) });
      return;
    } else return;
    e.preventDefault();
    setCursor(next);
    const dayStart = days[next.day];
    if (dayStart !== undefined) {
      setAnnounce(t('calendar.grid.cursor', { time: f.time(dayStart + next.min * 60_000) }));
    }
    scrollIntoRange(scroller.current, next.min);
  };

  const onColumnClick = (e: React.MouseEvent, day: number) => {
    if (drag.consumeClick() || e.target !== e.currentTarget) return;
    const minute = Math.floor(minuteAt(e.clientY) / KEY_STEP_MIN) * KEY_STEP_MIN;
    drawTo({ day, startMin: minute, endMin: Math.min(DAY_MINUTES, minute + 60) });
  };

  const isToday = (day: Timestamp) => isSameDay(day, now, timeZone);
  const nowMin = minutesOfDay(now, timeZone);
  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div
      className={s.grid}
      style={
        {
          '--days': days.length,
          '--zones': zones.length,
          '--hour-h': `${HOUR_PX}px`,
        } as React.CSSProperties
      }
      data-mode={days.length === 1 ? 'day' : 'week'}
    >
      <div
        ref={scroller}
        className={s.scroller}
        role="region"
        aria-label={t('calendar.grid.label')}
        tabIndex={-1}
      >
        <div className={s.inner}>
          <div className={s.corner} aria-hidden={zones.length === 0}>
            {zones.map((zone) => (
              <span key={zone} className={s.zoneHead} title={zone}>
                <span className={s.zoneCity}>{zoneCity(zone)}</span>
                <span className={s.zoneOffset}>
                  {formatOffset(offsetFrom(zone, timeZone, days[0] ?? now)) || '='}
                </span>
              </span>
            ))}
          </div>
          {days.map((day) => (
            <div key={day} className={cx(s.dayHead, isToday(day) && s.today)} aria-hidden="true">
              <span className={s.weekday}>{f.date(day, 'weekdayShort')}</span>
              <span className={s.dayNum}>{zonedParts(day, timeZone).day}</span>
            </div>
          ))}

          <div className={s.gutters} aria-hidden="true">
            {zones.map((zone) => (
              <ZoneGutter
                key={zone}
                day={days[0] ?? now}
                zone={zone}
                timeZone={timeZone}
                hours={props.workingHours}
              />
            ))}
            <div className={s.hours}>
              {hours.map((h) =>
                h === 0 ? null : (
                  <span key={h} className={s.hourLabel} style={{ top: h * HOUR_PX }}>
                    {f.time(atMinutes(days[0] ?? now, h * 60, timeZone))}
                  </span>
                ),
              )}
            </div>
          </div>

          {days.map((day, i) => {
            const items = placed[i] ?? [];
            const shared = sharedWindows[i];
            return (
              <div
                key={day}
                ref={(el) => {
                  columns.current[i] = el;
                }}
                className={cx(s.column, isToday(day) && s.todayColumn)}
                role="group"
                tabIndex={0}
                aria-label={t('calendar.grid.column', { date: f.date(day, 'weekdayDayMonth') })}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) drag.startDraw(e, i);
                }}
                onClick={(e) => onColumnClick(e, i)}
                onKeyDown={(e) => onColumnKey(e, i)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCursor(null);
                }}
              >
                {heatmap && <EnergyRail heatmap={heatmap} weekday={weekday(day, timeZone)} />}
                {shared && <SharedBand window={shared} day={day} timeZone={timeZone} />}
                <div className={cx(s.track, heatmap && s.withRail)}>
                  {ghosts.map((g) => (
                    <Ghost
                      key={g.id}
                      entry={g}
                      day={day}
                      dayEnd={dayAfter(day, timeZone)}
                      timeZone={timeZone}
                    />
                  ))}
                  {items.map((item) => {
                    const live = drag.preview?.key === item.instance.key ? drag.preview.slot : null;
                    if (live && live.day !== i) return null;
                    return (
                      <EventBlock
                        key={item.instance.key}
                        item={item}
                        live={live}
                        hintId={hintId}
                        highlighted={item.instance.event.id === props.highlightId}
                        onPointerDown={(e, gesture) => {
                          if (item.clippedStart || item.clippedEnd) return;
                          drag.startEvent(
                            e,
                            item.instance.key,
                            { day: i, startMin: item.top, endMin: item.top + item.height },
                            gesture,
                          );
                        }}
                        onClick={() => {
                          if (!drag.consumeClick()) props.onOpen(item.instance);
                        }}
                        onKeyDown={(e) => onEventKey(e, item, i)}
                      />
                    );
                  })}
                  {drag.preview?.key &&
                    drag.preview.slot.day === i &&
                    !items.some((it) => it.instance.key === drag.preview?.key) &&
                    (() => {
                      const hit = byKey.get(drag.preview.key);
                      return hit ? (
                        <EventBlock
                          item={hit.item}
                          live={drag.preview.slot}
                          hintId={hintId}
                          highlighted={false}
                        />
                      ) : null;
                    })()}
                  {drag.preview && !drag.preview.key && drag.preview.slot.day === i && (
                    <Draft slot={drag.preview.slot} day={day} timeZone={timeZone} />
                  )}
                  {cursor?.day === i && (
                    <div
                      className={s.cursor}
                      style={{ top: (cursor.min / 60) * HOUR_PX, height: HOUR_PX }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                {isToday(day) && (
                  <div
                    className={s.now}
                    style={{ top: (nowMin / 60) * HOUR_PX }}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <VisuallyHidden id={hintId}>{t('calendar.grid.eventKeys')}</VisuallyHidden>
      <VisuallyHidden aria-live="polite">{announce}</VisuallyHidden>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */

interface EventBlockProps {
  item: PlacedInstance;
  live: Slot | null;
  hintId: string;
  highlighted: boolean;
  onPointerDown?: (e: React.PointerEvent, gesture: 'move' | 'resize-start' | 'resize-end') => void;
  onClick?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
}

function EventBlock({
  item,
  live,
  hintId,
  highlighted,
  onPointerDown,
  onClick,
  onKeyDown,
}: EventBlockProps) {
  const t = useT();
  const f = useFormat();
  const { instance } = item;
  const { event } = instance;
  const top = live ? live.startMin : item.top;
  const height = live ? live.endMin - live.startMin : item.height;
  const startTs = live ? instance.start + (live.startMin - item.top) * 60_000 : instance.start;
  const endTs = live ? startTs + height * 60_000 : instance.end;
  const range = f.timeRange(startTs, endTs);
  const title = event.title || t('calendar.event.untitled');
  // Two lines (title + time) need about 44 px; below that the block switches to one row.
  const heightPx = (height / 60) * HOUR_PX;
  const compact = heightPx < 44;
  const short = heightPx < 56;
  const interactive = Boolean(onPointerDown);
  return (
    <button
      type="button"
      data-key={instance.key}
      className={cx(
        s.event,
        compact && s.compact,
        short && s.short,
        live && s.dragging,
        highlighted && s.highlighted,
        event.kind === 'buffer' && s.buffer,
        item.clippedStart && s.clippedStart,
        item.clippedEnd && s.clippedEnd,
      )}
      style={{
        top: (top / 60) * HOUR_PX,
        height: (height / 60) * HOUR_PX - 2,
        left: live ? 0 : `${(item.lane / item.lanes) * 100}%`,
        width: live ? 'calc(100% - 4px)' : `calc(${(100 * item.span) / item.lanes}% - 4px)`,
        background: categoryFill(event),
      }}
      aria-label={t('calendar.event.a11y', { title, range })}
      aria-describedby={interactive ? hintId : undefined}
      tabIndex={interactive ? 0 : -1}
      onPointerDown={onPointerDown ? (e) => onPointerDown(e, 'move') : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {interactive && !compact && (
        <span
          className={s.handleTop}
          onPointerDown={(e) => onPointerDown?.(e, 'resize-start')}
          aria-hidden="true"
        />
      )}
      <span className={s.eventTitle}>
        {event.icon && <span aria-hidden="true">{event.icon} </span>}
        {title}
      </span>
      <span className={s.eventMeta} aria-hidden="true">
        {range}
        {instance.recurring && <IconRepeat size={12} />}
        {event.fixed && <IconPin size={12} />}
      </span>
      {interactive && (
        <span
          className={s.handleBottom}
          onPointerDown={(e) => onPointerDown?.(e, 'resize-end')}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function Draft({ slot, day, timeZone }: { slot: Slot; day: Timestamp; timeZone: TimeZone }) {
  const t = useT();
  const f = useFormat();
  const interval = slotInterval(slot, [day], timeZone);
  const range = interval ? f.timeRange(interval.start, interval.end) : '';
  return (
    <div
      className={s.draft}
      style={{
        top: (slot.startMin / 60) * HOUR_PX,
        height: ((slot.endMin - slot.startMin) / 60) * HOUR_PX - 2,
      }}
      aria-hidden="true"
    >
      <span className={s.eventTitle}>{t('calendar.event.new')}</span>
      <span className={s.eventMeta}>{range}</span>
      <VisuallyHidden>{t('calendar.grid.draft', { range })}</VisuallyHidden>
    </div>
  );
}

function Ghost({
  entry,
  day,
  dayEnd,
  timeZone,
}: {
  entry: scheduler.SnapshotEntry;
  day: Timestamp;
  dayEnd: Timestamp;
  timeZone: TimeZone;
}) {
  const span = daySpan(entry.start, entry.end, day, dayEnd, timeZone);
  if (!span) return null;
  return (
    <div
      className={s.ghost}
      style={{
        top: (span.top / 60) * HOUR_PX,
        height: ((span.bottom - span.top) / 60) * HOUR_PX - 2,
      }}
      title={entry.title}
      aria-hidden="true"
    >
      <span className={s.ghostTitle}>{entry.title}</span>
    </div>
  );
}

function EnergyRail({
  heatmap,
  weekday: wd,
}: {
  heatmap: insights.EnergyHeatmap;
  weekday: number;
}) {
  const t = useT();
  const cells = heatForWeekday(heatmap, wd);
  return (
    <div className={s.energy} aria-hidden="true">
      {cells.map((c) => (
        <span
          key={c.hour}
          className={cx(s.heat, !c.reliable && s.heatPrior)}
          style={{ top: c.hour * HOUR_PX, background: `var(--heat-${c.level})` }}
          title={t('calendar.energy.cell', { hour: `${c.hour} h`, level: c.level })}
        />
      ))}
    </div>
  );
}

function SharedBand({
  window: w,
  day,
  timeZone,
}: {
  window: Interval;
  day: Timestamp;
  timeZone: TimeZone;
}) {
  const span = daySpan(w.start, w.end, day, dayAfter(day, timeZone), timeZone);
  if (!span) return null;
  return (
    <div
      className={s.shared}
      style={{ top: (span.top / 60) * HOUR_PX, height: ((span.bottom - span.top) / 60) * HOUR_PX }}
      aria-hidden="true"
    />
  );
}

function ZoneGutter({
  day,
  zone,
  timeZone,
  hours,
}: {
  day: Timestamp;
  zone: TimeZone;
  timeZone: TimeZone;
  hours: WorkingHours;
}) {
  const cells = zoneHours(day, timeZone, zone, hours);
  return (
    <div className={s.zone}>
      {cells.map((c, h) => (
        <span key={h} className={cx(s.zoneCell, s[c.kind])} style={{ top: h * HOUR_PX }}>
          {c.newDate ? '0' : c.hour}
          {c.minute ? <small>:{String(c.minute).padStart(2, '0')}</small> : null}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */

/** Local midnight after `day` (DST days last 23 or 25 hours). */
function dayAfter(day: Timestamp, timeZone: TimeZone): Timestamp {
  return addDays(day, 1, timeZone);
}

function defaultCursor(now: Timestamp, hours: WorkingHours, timeZone: TimeZone): number {
  const m = snap(minutesOfDay(now, timeZone), KEY_STEP_MIN);
  return m >= hours.start && m < hours.end ? m : hours.start;
}

function scrollIntoRange(el: HTMLElement | null, minute: number): void {
  if (!el) return;
  const y = (minute / 60) * HOUR_PX;
  const header = 56;
  if (y < el.scrollTop + header) el.scrollTop = y - header;
  else if (y + HOUR_PX > el.scrollTop + el.clientHeight)
    el.scrollTop = y + HOUR_PX - el.clientHeight;
}
