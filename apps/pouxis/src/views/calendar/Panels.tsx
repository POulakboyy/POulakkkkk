/** Optional strips above the grid: time progress (1.14), zones (1.5), energy legend (1.3), plan snapshot (1.9). */
import { useId, useMemo, useState, type FormEvent } from 'react';
import { addDays, insights, type TimeZone, type Timestamp, type WorkingHours } from '@pouxis/core';
import { intlLocale, useFormat, useT } from '../../i18n/index.ts';
import { Button, Chip, IconImage, ProgressBar, TextField } from '../../ui/index.ts';
import { PROGRESS_PERIODS, periodProgress } from './model/progress.ts';
import type { SnapshotSummary } from './model/snapshots.ts';
import {
  availableZones,
  formatOffset,
  isValidZone,
  offsetFrom,
  sharedWindow,
  zoneCity,
} from './model/zones.ts';
import s from './Panels.module.css';

export function ProgressStrip({ now, timeZone }: { now: Timestamp; timeZone: TimeZone }) {
  const t = useT();
  const f = useFormat();
  return (
    <div className={s.progress} role="group" aria-label={t('calendar.progress.label')}>
      {PROGRESS_PERIODS.map((period) => {
        const { ratio } = periodProgress(period, now, timeZone);
        return (
          <ProgressBar
            key={period}
            value={ratio}
            label={t(`calendar.progress.${period}Short`)}
            valueText={f.percent(ratio)}
            showValue
            size="sm"
            tone="mode"
            className={s.bar}
          />
        );
      })}
    </div>
  );
}

export interface ZonesPanelProps {
  zones: readonly TimeZone[];
  timeZone: TimeZone;
  day: Timestamp;
  now: Timestamp;
  workingHours: WorkingHours;
  onAdd: (zone: TimeZone) => void;
  onRemove: (zone: TimeZone) => void;
}

export function ZonesPanel({
  zones,
  timeZone,
  day,
  now,
  workingHours,
  onAdd,
  onRemove,
}: ZonesPanelProps) {
  const t = useT();
  const f = useFormat();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const options = useMemo(() => availableZones().filter((z) => z !== timeZone), [timeZone]);
  const shared =
    zones.length > 0
      ? sharedWindow(
          { start: day, end: addDays(day, 1, timeZone) },
          [timeZone, ...zones],
          workingHours,
        )
      : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const raw = query.trim();
    const zone =
      options.find((z) => z === raw || zoneCity(z).toLowerCase() === raw.toLowerCase()) ?? raw;
    if (!isValidZone(zone) || zone === timeZone) {
      setError(t('calendar.zones.invalid'));
      return;
    }
    onAdd(zone);
    setQuery('');
    setError(null);
  };

  return (
    <section className={s.panel} aria-labelledby={`${listId}-title`}>
      <h2 id={`${listId}-title`} className={s.panelTitle}>
        {t('calendar.zones.title')}
      </h2>
      {zones.length === 0 ? (
        <p className={s.muted}>{t('calendar.zones.empty')}</p>
      ) : (
        <ul className={s.zoneList}>
          {zones.map((zone) => {
            const offset = formatOffset(offsetFrom(zone, timeZone, now));
            const time = new Intl.DateTimeFormat(intlLocale(f.locale), {
              hour: 'numeric',
              minute: '2-digit',
              timeZone: zone,
            }).format(now);
            return (
              <li key={zone}>
                <Chip
                  onRemove={() => onRemove(zone)}
                  removeLabel={`${t('calendar.zones.remove')} : ${zoneCity(zone)}`}
                >
                  <strong>{zoneCity(zone)}</strong>&nbsp;
                  <span className={s.tabular}>{time}</span>
                  {offset && <span className={s.muted}>&nbsp;· {offset}</span>}
                </Chip>
              </li>
            );
          })}
        </ul>
      )}
      <form className={s.zoneForm} onSubmit={submit}>
        <TextField
          label={t('calendar.zones.add')}
          hideLabel
          placeholder={t('calendar.zones.search')}
          list={listId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          error={error ?? undefined}
          autoComplete="off"
        />
        <datalist id={listId}>
          {options.map((z) => (
            <option key={z} value={z}>
              {zoneCity(z)}
            </option>
          ))}
        </datalist>
        <Button type="submit" variant="secondary" disabled={zones.length >= 6}>
          {t('calendar.zones.add')}
        </Button>
      </form>
      {zones.length > 0 && (
        <p className={s.shared}>
          {shared
            ? t('calendar.zones.overlap', { range: f.timeRange(shared.start, shared.end) })
            : t('calendar.zones.noOverlap')}
          <span className={s.muted}> {t('calendar.zones.assumption')}</span>
        </p>
      )}
    </section>
  );
}

export function EnergyLegend({ heatmap }: { heatmap: insights.EnergyHeatmap }) {
  const t = useT();
  const f = useFormat();
  const peak = heatmap.peak;
  // 2026-11-01 is a Sunday: index weekdays from it so `weekday` 0 = Sunday.
  const peakDay = peak ? f.date(Date.UTC(2026, 10, 1 + peak.weekday, 12), 'weekday') : null;
  return (
    <section className={s.panel} aria-label={t('calendar.energy.title')}>
      <div className={s.legendRow}>
        <h2 className={s.panelTitle}>{t('calendar.energy.title')}</h2>
        <span className={s.ramp} aria-hidden="true">
          <span className={s.rampLabel}>{t('calendar.energy.low')}</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={s.swatch} style={{ background: `var(--heat-${l})` }} />
          ))}
          <span className={s.rampLabel}>{t('calendar.energy.high')}</span>
        </span>
      </div>
      {peak && peakDay && (
        <p className={s.text}>
          {t('calendar.energy.peak', { day: peakDay, hour: `${peak.hour} h` })}
        </p>
      )}
      <p className={s.muted}>
        {heatmap.enoughData ? t('calendar.energy.rail') : t('calendar.energy.learning')}
      </p>
    </section>
  );
}

export interface SnapshotPanelProps {
  takenAt: Timestamp | null;
  summary: SnapshotSummary | null;
  onTake: () => void;
}

export function SnapshotPanel({ takenAt, summary, onTake }: SnapshotPanelProps) {
  const t = useT();
  const f = useFormat();
  const stats: { key: 'kept' | 'moved' | 'added' | 'dropped'; value: number }[] = summary
    ? [
        { key: 'kept', value: summary.kept },
        { key: 'moved', value: summary.moved },
        { key: 'added', value: summary.added },
        { key: 'dropped', value: summary.removed },
      ]
    : [];
  return (
    <section className={s.panel} aria-label={t('calendar.snapshot.title')}>
      <div className={s.legendRow}>
        <h2 className={s.panelTitle}>{t('calendar.snapshot.title')}</h2>
        <Button variant="secondary" size="sm" iconStart={<IconImage size={16} />} onClick={onTake}>
          {t(takenAt === null ? 'calendar.snapshot.take' : 'calendar.snapshot.retake')}
        </Button>
      </div>
      {takenAt === null || !summary ? (
        <p className={s.muted}>{t('calendar.snapshot.empty')}</p>
      ) : (
        <>
          <p className={s.muted}>
            {t('calendar.snapshot.takenAt', {
              date: f.date(takenAt, 'dayMonth'),
              time: f.time(takenAt),
            })}
          </p>
          <dl className={s.stats}>
            {stats.map((st) => (
              <div key={st.key} className={s.stat}>
                <dt>{t(`calendar.snapshot.${st.key}`)}</dt>
                <dd className={s.tabular}>{f.number(st.value)}</dd>
              </div>
            ))}
            {summary.accuracy !== undefined && (
              <div className={s.stat}>
                <dt>{t('calendar.snapshot.accuracyLabel')}</dt>
                <dd className={s.tabular}>{f.percent(summary.accuracy)}</dd>
              </div>
            )}
          </dl>
          <p className={s.muted}>
            {t('calendar.snapshot.ghosts')} {t('calendar.snapshot.note')}
          </p>
        </>
      )}
    </section>
  );
}
