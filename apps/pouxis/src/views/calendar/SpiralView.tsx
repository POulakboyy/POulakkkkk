/**
 * Non-linear time view (1.4): time runs along a continuous spiral, one turn per day, week,
 * month or year. The same hour (or weekday, or month) lines up across turns, with no cut at
 * the end of a week or a month. Arrow keys travel along it, + / − zoom.
 */
import {
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from 'react';
import {
  fromZoned,
  startOfDay,
  startOfWeek,
  zonedParts,
  type CalendarEvent,
  type Locale,
  type TimeZone,
  type Timestamp,
} from '@pouxis/core';
import { intlLocale, useFormat, useT } from '../../i18n/index.ts';
import {
  Button,
  IconButton,
  IconMinus,
  IconPlus,
  IconRepeat,
  SectionHeader,
} from '../../ui/index.ts';
import { categoryFill } from './model/colors.ts';
import { expandEvents, type EventInstance } from './model/expand.ts';
import {
  SPIRAL_SPANS,
  arcPath,
  extent,
  fitSpiral,
  pointAt,
  timeAt,
  type SpiralGeometry,
  type SpiralSpan,
} from './model/spiral.ts';
import s from './SpiralView.module.css';

const SIZE = 600;

/** Turns shown and how many of them lie before "now", per zoom level. */
const LAYOUT: Record<SpiralSpan, { turns: number; past: number }> = {
  day: { turns: 7, past: 3 },
  week: { turns: 6, past: 2 },
  month: { turns: 6, past: 2 },
  year: { turns: 4, past: 1 },
};

export interface SpiralViewProps {
  events: readonly CalendarEvent[];
  now: Timestamp;
  timeZone: TimeZone;
  locale: Locale;
  span: SpiralSpan;
  onSpanChange: (span: SpiralSpan) => void;
  onOpen: (instance: EventInstance) => void;
}

export function SpiralView({
  events,
  now,
  timeZone,
  locale,
  span,
  onSpanChange,
  onOpen,
}: SpiralViewProps) {
  const t = useT();
  const f = useFormat();
  const hintId = useId();
  const [offset, setOffset] = useState(0);
  const [hover, setHover] = useState<Timestamp | null>(null);

  const turnMs = SPIRAL_SPANS.find((x) => x.span === span)?.turnMs ?? SPIRAL_SPANS[0]!.turnMs;
  const geometry = useMemo(
    () =>
      fitSpiral({
        size: SIZE,
        turnMs,
        alignTo: alignment(span, now, timeZone) + offset * turnMs,
        pastTurns: LAYOUT[span].past,
        turns: LAYOUT[span].turns,
        innerRadius: 54,
        padding: 44,
      }),
    [span, now, timeZone, offset, turnMs],
  );
  const range = extent(geometry);
  const instances = useMemo(
    () => expandEvents(events, range, locale).filter((i) => i.event.kind !== 'buffer'),
    // `range` is derived from `geometry`.
    [events, geometry, locale],
  );
  const upcoming = instances.filter((i) => i.end > now).slice(0, 6);
  const markers = useMemo(() => turnMarkers(span, geometry, timeZone), [span, geometry, timeZone]);
  const ticks = useMemo(
    () => ringTicks(span, geometry, timeZone, now, intlLocale(locale)),
    [span, geometry, timeZone, now, locale],
  );
  const stroke = geometry.gap * 0.56;
  const nowPoint = now >= range.start && now <= range.end ? pointAt(now, geometry) : null;
  const spanIndex = SPIRAL_SPANS.findIndex((x) => x.span === span);

  const zoom = (dir: -1 | 1) => {
    const next = SPIRAL_SPANS[spanIndex + dir];
    if (next) {
      onSpanChange(next.span);
      setOffset(0);
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setOffset((o) => o - 1);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setOffset((o) => o + 1);
    else if (e.key === '+' || e.key === '=') zoom(-1);
    else if (e.key === '-' || e.key === '_') zoom(1);
    else if (e.key === 'Home') setOffset(0);
    else return;
    e.preventDefault();
  };

  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    zoom(e.deltaY < 0 ? -1 : 1);
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const matrix = svg.getScreenCTM?.();
    if (!matrix) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    setHover(timeAt(p.x, p.y, geometry));
  };

  return (
    <div className={s.layout}>
      <figure className={s.figure}>
        <svg
          className={s.svg}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="group"
          aria-label={t('calendar.spiral.label')}
          aria-describedby={hintId}
          tabIndex={0}
          onKeyDown={onKey}
          onWheel={onWheel}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
        >
          <path
            className={s.track}
            d={arcPath(range.start, range.end, geometry)}
            strokeWidth={stroke}
          />
          {nowPoint && (
            <path className={s.past} d={arcPath(range.start, now, geometry)} strokeWidth={1.5} />
          )}
          <path
            className={s.future}
            d={arcPath(Math.max(now, range.start), range.end, geometry)}
            strokeWidth={1}
          />
          {ticks.map((tick) => (
            <g key={tick.key} aria-hidden="true">
              <line className={s.tick} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} />
              {tick.label && (
                <text
                  className={s.tickLabel}
                  x={tick.lx}
                  y={tick.ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {tick.label}
                </text>
              )}
            </g>
          ))}
          {instances.map((i) => (
            <path
              key={`edge-${i.key}`}
              className={s.eventEdge}
              d={arcPath(i.start, i.end, geometry)}
              strokeWidth={stroke + 2}
              aria-hidden="true"
            />
          ))}
          {instances.map((i) => (
            <path
              key={i.key}
              className={s.event}
              d={arcPath(i.start, i.end, geometry)}
              stroke={categoryFill(i.event)}
              strokeWidth={stroke}
              onClick={() => onOpen(i)}
            >
              <title>{`${i.event.title || t('calendar.event.untitled')} · ${f.date(i.start, 'dayMonthShort')} ${f.timeRange(i.start, i.end)}`}</title>
            </path>
          ))}
          {markers.map((m) => (
            <g key={m.at} aria-hidden="true">
              <circle className={s.marker} cx={m.x} cy={m.y} r={2.5} />
              <text className={s.markerLabel} x={m.x + 6} y={m.y - 6}>
                {f.date(m.at, m.style)}
              </text>
            </g>
          ))}
          {nowPoint && (
            <g aria-hidden="true">
              <circle className={s.nowHalo} cx={nowPoint.x} cy={nowPoint.y} r={11} />
              <circle className={s.now} cx={nowPoint.x} cy={nowPoint.y} r={6} />
            </g>
          )}
          <text
            className={s.centerLabel}
            x={SIZE / 2}
            y={SIZE / 2 - 6}
            textAnchor="middle"
            aria-hidden="true"
          >
            {f.date(range.start, 'dayMonthShort')}
          </text>
          <text
            className={s.centerSub}
            x={SIZE / 2}
            y={SIZE / 2 + 12}
            textAnchor="middle"
            aria-hidden="true"
          >
            {f.date(range.end - 1, 'dayMonthShort')}
          </text>
        </svg>
        <figcaption className={s.caption}>
          <span className={s.readout} aria-hidden="true">
            {hover !== null
              ? `${f.date(hover, 'weekdayDayMonth')} · ${f.time(hover)}`
              : t('calendar.spiral.legend')}
          </span>
          <span id={hintId} className={s.keys}>
            {t('calendar.spiral.a11y')} {t('calendar.spiral.keys')}
          </span>
        </figcaption>
      </figure>

      <aside className={s.side}>
        <div className={s.controls}>
          <IconButton
            label={t('calendar.spiral.zoomIn')}
            icon={<IconPlus size={18} />}
            variant="secondary"
            disabled={spanIndex <= 0}
            onClick={() => zoom(-1)}
          />
          <span className={s.span} aria-live="polite">
            {t('calendar.spiral.turn', { span })}
          </span>
          <IconButton
            label={t('calendar.spiral.zoomOut')}
            icon={<IconMinus size={18} />}
            variant="secondary"
            disabled={spanIndex >= SPIRAL_SPANS.length - 1}
            onClick={() => zoom(1)}
          />
        </div>
        {offset !== 0 && (
          <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
            {t('calendar.spiral.centerOnNow')}
          </Button>
        )}
        <SectionHeader title={t('calendar.spiral.upcoming')} />
        {upcoming.length === 0 ? (
          <p className={s.empty}>{t('calendar.spiral.nothingUpcoming')}</p>
        ) : (
          <ul className={s.list}>
            {upcoming.map((i) => (
              <li key={i.key}>
                <button type="button" className={s.item} onClick={() => onOpen(i)}>
                  <span
                    className={s.swatch}
                    style={{ background: categoryFill(i.event) }}
                    aria-hidden="true"
                  />
                  <span className={s.itemText}>
                    <span className={s.itemTitle}>
                      {i.event.title || t('calendar.event.untitled')}
                      {i.recurring && <IconRepeat size={12} />}
                    </span>
                    <span className={s.itemWhen}>
                      {f.relativeDay(i.start, now)} · {f.timeRange(i.start, i.end)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */

/** Instant each turn starts on: local midnight, Monday, the 1st or 1 January. */
export function alignment(span: SpiralSpan, now: Timestamp, timeZone: TimeZone): Timestamp {
  const p = zonedParts(now, timeZone);
  switch (span) {
    case 'day':
      return startOfDay(now, timeZone);
    case 'week':
      return startOfWeek(now, timeZone);
    case 'month':
      return fromZoned({ year: p.year, month: p.month, day: 1 }, timeZone);
    case 'year':
      return fromZoned({ year: p.year, month: 1, day: 1 }, timeZone);
  }
}

interface Marker {
  at: Timestamp;
  x: number;
  y: number;
  style: 'weekdayShort' | 'dayMonthShort' | 'monthYear';
}

/** A labelled dot where each turn's unit begins (a day, a week, a month, a year). */
function turnMarkers(span: SpiralSpan, g: SpiralGeometry, timeZone: TimeZone): Marker[] {
  const { start, end } = extent(g);
  const out: Marker[] = [];
  for (let k = 0; k <= g.turns; k++) {
    const approx = g.origin + k * g.turnMs;
    const at = alignment(span, approx + g.turnMs / 2, timeZone);
    if (at < start || at > end || out.some((m) => m.at === at)) continue;
    const p = pointAt(at, g);
    const style = span === 'day' ? 'weekdayShort' : span === 'year' ? 'monthYear' : 'dayMonthShort';
    out.push({ at, x: p.x, y: p.y, style });
  }
  return out;
}

interface Tick {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lx: number;
  ly: number;
  label?: string;
}

/** Subdivisions of one turn drawn around the outside: hours, weekdays, days or months. */
function ringTicks(
  span: SpiralSpan,
  g: SpiralGeometry,
  timeZone: TimeZone,
  now: Timestamp,
  lang: string,
): Tick[] {
  const outer = g.innerRadius + g.gap * g.turns + g.gap * 0.45;
  const fractions: { f: number; label?: string }[] = [];
  if (span === 'day') {
    for (let h = 0; h < 24; h++)
      fractions.push({ f: h / 24, label: h % 6 === 0 ? `${h}` : undefined });
  } else if (span === 'week') {
    const monday = startOfWeek(now, timeZone);
    for (let d = 0; d < 7; d++) {
      const label = new Intl.DateTimeFormat(lang, { weekday: 'narrow', timeZone }).format(
        monday + d * 86_400_000 + 12 * 3_600_000,
      );
      fractions.push({ f: d / 7, label });
    }
  } else if (span === 'month') {
    for (const d of [1, 8, 15, 22]) fractions.push({ f: (d - 1) / 30.436875, label: String(d) });
  } else {
    const year = zonedParts(now, timeZone).year;
    const jan = fromZoned({ year, month: 1, day: 1 }, timeZone);
    for (let m = 0; m < 12; m++) {
      const at = fromZoned({ year, month: m + 1, day: 1 }, timeZone);
      const label = new Intl.DateTimeFormat(lang, { month: 'narrow', timeZone }).format(
        at + 86_400_000,
      );
      fractions.push({ f: (at - jan) / g.turnMs, label });
    }
  }
  return fractions.map(({ f, label }, i) => {
    const angle = f * Math.PI * 2;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const r1 = outer;
    const r2 = outer + (label ? 7 : 4);
    const rl = outer + 18;
    return {
      key: `${span}-${i}`,
      x1: g.cx + r1 * sin,
      y1: g.cy - r1 * cos,
      x2: g.cx + r2 * sin,
      y2: g.cy - r2 * cos,
      lx: g.cx + rl * sin,
      ly: g.cy - rl * cos,
      label,
    };
  });
}
