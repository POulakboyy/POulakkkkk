import { useMemo, useState, type CSSProperties } from 'react';
import type { insights } from '@pouxis/core';
import { useFormat, useT, type MessageKey } from '../../i18n/index.ts';
import { ChartCard } from './ChartCard.tsx';
import { dayKeyWeekday, stackSegments, weekdayNames } from './model.ts';
import s from './Insights.module.css';

/** Series in fixed order; colours validated together for colour-vision deficiencies. */
export const BALANCE_SERIES = [
  { key: 'create', label: 'insights.balance.create', color: 'var(--viz-1)' },
  { key: 'organize', label: 'insights.balance.organize', color: 'var(--viz-2)' },
  { key: 'meetings', label: 'insights.balance.meetings', color: 'var(--viz-7)' },
] as const satisfies readonly { key: string; label: MessageKey; color: string }[];

const BAR_W = 600;
const COL_W = 100;
const COL_H = 160;
const GAP = 2;

export interface BalanceChartProps {
  balance: insights.Balance;
  today: string;
  index?: number;
}

/** Creation / organisation / meetings (7.2): weekly share bar plus one stacked column per day. */
export function BalanceChart({ balance, today, index }: BalanceChartProps) {
  const t = useT();
  const f = useFormat();
  const [active, setActive] = useState<number | null>(null);
  const shortDays = useMemo(() => weekdayNames(f.locale, 'short'), [f.locale]);
  const longDays = useMemo(() => weekdayNames(f.locale, 'long'), [f.locale]);
  const dayMax = Math.max(1, ...balance.days.map((d) => d.total));
  const values = (d: insights.BalanceTotals) => BALANCE_SERIES.map((x) => d[x.key]);
  const weekdayOf = (d: insights.BalanceDay) => dayKeyWeekday(d.day);

  const summary = (d: insights.BalanceTotals) =>
    t('insights.balance.a11y', {
      create: f.duration(d.create),
      organize: f.duration(d.organize),
      meetings: f.duration(d.meetings),
    });

  const table = () => (
    <div
      className={s.tableWrap}
      tabIndex={0}
      role="region"
      aria-label={t('insights.balance.title')}
    >
      <table className={s.table}>
        <thead>
          <tr>
            <th scope="col">{t('insights.balance.dayColumn')}</th>
            {BALANCE_SERIES.map((x) => (
              <th key={x.key} scope="col">
                {t(x.label)}
              </th>
            ))}
            <th scope="col">{t('insights.balance.totalColumn')}</th>
          </tr>
        </thead>
        <tbody>
          {balance.days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{longDays[weekdayOf(d)]}</th>
              {values(d).map((v, i) => (
                <td key={i}>{f.duration(v)}</td>
              ))}
              <td>{f.duration(d.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (balance.total === 0) {
    return (
      <ChartCard
        title={t('insights.balance.title')}
        hint={t('insights.balance.hint')}
        index={index}
      >
        <p className={s.muted}>{t('insights.balance.noData')}</p>
      </ChartCard>
    );
  }

  const week = stackSegments(values(balance), BAR_W, GAP);
  const activeDay = active === null ? undefined : balance.days[active];

  return (
    <ChartCard
      title={t('insights.balance.title')}
      hint={t('insights.balance.hint')}
      table={table}
      index={index}
    >
      <div className={s.balanceHead}>
        <p className={s.bigStat}>
          {f.percent(balance.ratio ?? 0)}
          <span>{t('insights.balance.creationShare')}</span>
        </p>
        <p className={s.muted}>
          {t('insights.balance.total', { duration: f.duration(balance.total) })}
        </p>
      </div>
      <svg
        className={s.shareBar}
        viewBox={`0 0 ${BAR_W} 20`}
        preserveAspectRatio="none"
        role="img"
        aria-label={summary(balance)}
      >
        {week.map((seg, i) =>
          seg.width > 0 ? (
            <rect
              key={BALANCE_SERIES[i]?.key}
              className={s.growX}
              x={seg.x}
              y={0}
              width={seg.width}
              height={20}
              rx={4}
              fill={BALANCE_SERIES[i]?.color}
            />
          ) : null,
        )}
      </svg>
      <ul className={s.legend}>
        {BALANCE_SERIES.map((x) => (
          <li key={x.key}>
            <span className={s.swatch} style={{ background: x.color }} aria-hidden="true" />
            {t(x.label)}
            <b>{f.percent(balance.shares?.[x.key] ?? 0)}</b>
          </li>
        ))}
      </ul>
      <div className={s.days} data-active={active === null ? 'false' : 'true'}>
        <svg
          className={s.daySvg}
          viewBox={`0 0 ${COL_W * 7} ${COL_H}`}
          aria-label={t('insights.balance.daysLabel')}
          role="group"
          onPointerLeave={() => setActive(null)}
        >
          {balance.days.map((d, i) => {
            const height = (d.total / dayMax) * (COL_H - 4);
            const segs = stackSegments(values(d), height, d.total > 0 ? GAP : 0);
            const x = i * COL_W + COL_W * 0.28;
            const w = COL_W * 0.44;
            return (
              <g
                key={d.day}
                className={s.dayCol}
                data-on={active === i ? 'true' : 'false'}
                tabIndex={0}
                role="img"
                aria-label={t('insights.balance.day', {
                  day: longDays[weekdayOf(d)] ?? '',
                  summary: summary(d),
                })}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                style={{ '--i': i } as CSSProperties}
              >
                <rect x={i * COL_W} y={0} width={COL_W} height={COL_H} fill="transparent" />
                {d.total === 0 ? (
                  <rect x={x} y={COL_H - 2} width={w} height={2} rx={1} fill="var(--line-strong)" />
                ) : (
                  segs.map((seg, k) =>
                    seg.width > 0 ? (
                      <rect
                        key={k}
                        className={s.grow}
                        x={x}
                        y={COL_H - seg.x - seg.width}
                        width={w}
                        height={seg.width}
                        rx={Math.min(4, seg.width / 2)}
                        fill={BALANCE_SERIES[k]?.color}
                      />
                    ) : null,
                  )
                )}
              </g>
            );
          })}
        </svg>
        <div className={s.dayLabels} aria-hidden="true">
          {balance.days.map((d) => (
            <span key={d.day} data-today={d.day === today ? 'true' : 'false'}>
              {shortDays[weekdayOf(d)]}
            </span>
          ))}
        </div>
        <p className={s.readout} aria-hidden="true">
          {activeDay
            ? `${longDays[weekdayOf(activeDay)] ?? ''} · ${summary(activeDay)}`
            : t('insights.balance.readoutHint')}
        </p>
      </div>
    </ChartCard>
  );
}
