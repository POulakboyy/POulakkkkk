/**
 * Month overview: six weeks of seven days, up to three events per day. Arrow keys move between
 * days (roving tab stop), Enter opens the day.
 */
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { addDays, isSameDay, zonedParts, type TimeZone, type Timestamp } from '@pouxis/core';
import { useFormat, useT } from '../../i18n/index.ts';
import { VisuallyHidden, cx } from '../../ui/index.ts';
import { categoryFill } from './model/colors.ts';
import type { EventInstance } from './model/expand.ts';
import { inMonth, isoWeek } from './model/range.ts';
import s from './MonthGrid.module.css';

const VISIBLE = 3;

export interface MonthGridProps {
  days: readonly Timestamp[];
  anchor: Timestamp;
  now: Timestamp;
  timeZone: TimeZone;
  instances: readonly EventInstance[];
  onOpenDay: (day: Timestamp) => void;
  onOpenEvent: (instance: EventInstance) => void;
}

export function MonthGrid({
  days,
  anchor,
  now,
  timeZone,
  instances,
  onOpenDay,
  onOpenEvent,
}: MonthGridProps) {
  const t = useT();
  const f = useFormat();
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const todayIndex = days.findIndex((d) => isSameDay(d, now, timeZone));
  const [focusIndex, setFocusIndex] = useState(() =>
    todayIndex >= 0 ? todayIndex : days.findIndex((d) => inMonth(d, anchor, timeZone)),
  );

  const perDay = useMemo(
    () =>
      days.map((day) => {
        const end = addDays(day, 1, timeZone);
        return instances.filter((i) => i.start < end && i.end > day && i.event.kind !== 'buffer');
      }),
    [days, instances, timeZone],
  );

  const onKey = (e: KeyboardEvent, index: number) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    let next = index + (moves[e.key] ?? 0);
    if (e.key === 'Home') next = index - (index % 7);
    if (e.key === 'End') next = index - (index % 7) + 6;
    if (next === index || next < 0 || next >= days.length) return;
    e.preventDefault();
    setFocusIndex(next);
    cells.current[next]?.focus();
  };

  const weekdays = days.slice(0, 7);
  return (
    <div className={s.month} role="grid" aria-label={t('calendar.month.label')}>
      <div className={s.row} role="row">
        <span className={s.weekCol} aria-hidden="true" />
        {weekdays.map((d) => (
          <span key={d} className={s.weekday} role="columnheader">
            <span aria-hidden="true">{f.date(d, 'weekdayShort')}</span>
            <VisuallyHidden>{f.date(d, 'weekday')}</VisuallyHidden>
          </span>
        ))}
      </div>
      {Array.from({ length: days.length / 7 }, (_, w) => (
        <div key={w} className={s.row} role="row">
          <span className={s.weekCol} aria-hidden="true">
            {isoWeek(days[w * 7] ?? anchor, timeZone)}
          </span>
          {days.slice(w * 7, w * 7 + 7).map((day, j) => {
            const index = w * 7 + j;
            const items = perDay[index] ?? [];
            const outside = !inMonth(day, anchor, timeZone);
            const today = index === todayIndex;
            return (
              <div key={day} role="gridcell" className={cx(s.cell, outside && s.outside)}>
                <button
                  type="button"
                  ref={(el) => {
                    cells.current[index] = el;
                  }}
                  className={s.dayButton}
                  tabIndex={index === focusIndex ? 0 : -1}
                  aria-current={today ? 'date' : undefined}
                  aria-label={t('calendar.month.day', {
                    date: f.date(day, 'weekdayDayMonth'),
                    count: items.length,
                  })}
                  onClick={() => onOpenDay(day)}
                  onKeyDown={(e) => onKey(e, index)}
                  onFocus={() => setFocusIndex(index)}
                >
                  <span className={cx(s.num, today && s.today)}>
                    {zonedParts(day, timeZone).day}
                  </span>
                  {items.length > 0 && (
                    <span className={s.dots} aria-hidden="true">
                      {items.slice(0, 4).map((i) => (
                        <span
                          key={i.key}
                          className={s.dot}
                          style={{ background: categoryFill(i.event) }}
                        />
                      ))}
                    </span>
                  )}
                </button>
                <ul className={s.events}>
                  {items.slice(0, VISIBLE).map((i) => (
                    <li key={i.key}>
                      <button
                        type="button"
                        tabIndex={-1}
                        className={s.event}
                        style={{ background: categoryFill(i.event) }}
                        onClick={() => onOpenEvent(i)}
                      >
                        <span className={s.time}>{f.time(i.start)}</span>
                        <span className={s.title}>
                          {i.event.title || t('calendar.event.untitled')}
                        </span>
                      </button>
                    </li>
                  ))}
                  {items.length > VISIBLE && (
                    <li>
                      <button
                        type="button"
                        tabIndex={-1}
                        className={s.more}
                        onClick={() => onOpenDay(day)}
                      >
                        {t('calendar.month.more', { count: items.length - VISIBLE })}
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
