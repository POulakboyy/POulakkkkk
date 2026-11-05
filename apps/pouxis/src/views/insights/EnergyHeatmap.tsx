import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { insights } from '@pouxis/core';
import { useFormat, useT } from '../../i18n/index.ts';
import { ChartCard } from './ChartCard.tsx';
import { WEEK_ROWS, cellScale, heatLevel, hourLabel, weekdayNames } from './model.ts';
import s from './Insights.module.css';

const CELL = 20;
const HOURS = 24;
const ROWS = WEEK_ROWS.length;
/** Hours labelled under the plot; the odd ones collapse on narrow screens. */
const HOUR_TICKS = [0, 3, 6, 9, 12, 15, 18, 21] as const;

interface Cursor {
  row: number;
  hour: number;
}

export interface EnergyHeatmapProps {
  energy: insights.EnergyHeatmap;
  index?: number;
}

/** Energy heatmap 7×24 (1.3): colour = energy, square size = confidence of the estimate. */
export function EnergyHeatmap({ energy, index }: EnergyHeatmapProps) {
  const t = useT();
  const f = useFormat();
  const readoutId = useId();
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const days = useMemo(() => weekdayNames(f.locale, 'short'), [f.locale]);
  const longDays = useMemo(() => weekdayNames(f.locale, 'long'), [f.locale]);

  const cellAt = (c: Cursor) => energy.cells[WEEK_ROWS[c.row] ?? 1]?.[c.hour];
  const describe = (c: Cursor): string => {
    const cell = cellAt(c);
    if (!cell) return '';
    return t('insights.energy.cell', {
      day: longDays[cell.weekday] ?? '',
      hour: hourLabel(cell.hour, f.locale),
      value: f.percent(cell.value),
      confidence: t(cell.enoughData ? 'insights.energy.confident' : 'insights.energy.tentative'),
    });
  };

  const peak = energy.peak
    ? t('insights.energy.peak', {
        day: longDays[energy.peak.weekday] ?? '',
        hour: hourLabel(energy.peak.hour, f.locale),
      })
    : t('insights.energy.notEnough');

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const c = cursor ?? { row: 0, hour: 9 };
    const moves: Record<string, Cursor> = {
      ArrowLeft: { row: c.row, hour: Math.max(0, c.hour - 1) },
      ArrowRight: { row: c.row, hour: Math.min(HOURS - 1, c.hour + 1) },
      ArrowUp: { row: Math.max(0, c.row - 1), hour: c.hour },
      ArrowDown: { row: Math.min(ROWS - 1, c.row + 1), hour: c.hour },
      Home: { row: c.row, hour: 0 },
      End: { row: c.row, hour: HOURS - 1 },
    };
    const next = moves[e.key];
    if (next) {
      e.preventDefault();
      setCursor(next);
    } else if (e.key === 'Escape') {
      setCursor(null);
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const hour = Math.floor(((e.clientX - box.left) / box.width) * HOURS);
    const row = Math.floor(((e.clientY - box.top) / box.height) * ROWS);
    if (hour < 0 || hour >= HOURS || row < 0 || row >= ROWS) return;
    if (cursor?.hour !== hour || cursor.row !== row) setCursor({ row, hour });
  };

  const table = () => (
    <div className={s.tableWrap} tabIndex={0} role="region" aria-label={t('insights.energy.title')}>
      <table className={s.table}>
        <thead>
          <tr>
            <th scope="col">{t('insights.energy.hourColumn')}</th>
            {WEEK_ROWS.map((d) => (
              <th key={d} scope="col">
                {days[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: HOURS }, (_, h) => (
            <tr key={h}>
              <th scope="row">{hourLabel(h, f.locale)}</th>
              {WEEK_ROWS.map((d) => {
                const cell = energy.cells[d]?.[h];
                return (
                  <td key={d}>
                    {cell ? f.percent(cell.value) : '—'}
                    {cell && !cell.enoughData ? ' *' : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={s.muted}>* {t('insights.energy.tentative')}</p>
    </div>
  );

  return (
    <ChartCard
      title={t('insights.energy.title')}
      hint={t('insights.energy.hint')}
      table={table}
      index={index}
    >
      <p className={s.peak}>{peak}</p>
      <div className={s.heat}>
        <div className={s.heatDays} aria-hidden="true">
          {WEEK_ROWS.map((d) => (
            <span key={d}>{days[d]}</span>
          ))}
        </div>
        <div
          className={s.heatPlot}
          tabIndex={0}
          role="img"
          aria-roledescription={t('insights.energy.roledescription')}
          aria-label={t('insights.energy.a11ySummary', { peak })}
          aria-describedby={readoutId}
          data-active={cursor ? 'true' : 'false'}
          onKeyDown={onKeyDown}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setCursor(null)}
          onBlur={() => setCursor(null)}
        >
          <svg
            className={s.heatSvg}
            viewBox={`0 0 ${HOURS * CELL} ${ROWS * CELL}`}
            aria-hidden="true"
            focusable="false"
          >
            {WEEK_ROWS.map((d, row) =>
              Array.from({ length: HOURS }, (_, hour) => {
                const cell = energy.cells[d]?.[hour];
                if (!cell) return null;
                const size = (CELL - 2) * cellScale(cell.confidence);
                const on = cursor?.row === row && cursor.hour === hour;
                return (
                  <rect
                    key={`${d}-${hour}`}
                    className={s.heatCell}
                    data-on={on ? 'true' : 'false'}
                    x={hour * CELL + (CELL - size) / 2}
                    y={row * CELL + (CELL - size) / 2}
                    width={size}
                    height={size}
                    rx={Math.min(4, size / 4)}
                    fill={`var(--heat-${heatLevel(cell.value)})`}
                  />
                );
              }),
            )}
            {cursor ? (
              <rect
                className={s.heatCursor}
                x={cursor.hour * CELL + 0.75}
                y={cursor.row * CELL + 0.75}
                width={CELL - 1.5}
                height={CELL - 1.5}
                rx={5}
              />
            ) : null}
          </svg>
        </div>
        <div className={s.heatHours} aria-hidden="true">
          {HOUR_TICKS.map((h) => (
            <span
              key={h}
              className={h % 6 === 0 ? undefined : s.minorTick}
              style={{ insetInlineStart: `${(h / HOURS) * 100}%` }}
            >
              {hourLabel(h, f.locale)}
            </span>
          ))}
        </div>
      </div>
      <p id={readoutId} className={s.readout} aria-live="polite">
        {cursor ? describe(cursor) : t('insights.energy.readoutHint')}
      </p>
      <div className={s.legendRow}>
        <span className={s.ramp} aria-hidden="true">
          {t('insights.energy.legendLow')}
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <i key={l} style={{ background: `var(--heat-${l})` }} />
          ))}
          {t('insights.energy.legendHigh')}
        </span>
        <span className={s.ramp}>
          <svg width="30" height="14" viewBox="0 0 30 14" aria-hidden="true" focusable="false">
            <rect x="0" y="0" width="14" height="14" rx="3" fill="var(--heat-3)" />
            <rect x="20" y="3.5" width="7" height="7" rx="2" fill="var(--heat-3)" />
          </svg>
          {t('insights.energy.legendConfidence')}
        </span>
      </div>
      {!energy.enoughData ? <p className={s.muted}>{t('insights.energy.priorNote')}</p> : null}
    </ChartCard>
  );
}
