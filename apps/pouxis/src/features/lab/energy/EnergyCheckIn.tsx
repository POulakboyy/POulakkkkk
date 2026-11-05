import { useId, useMemo, type CSSProperties } from 'react';
import type { Energy, Task } from '@pouxis/core';
import { useAppPrefs } from '../../../app/appPrefs.ts';
import { useFormat, useT, type MessageKey } from '../../../i18n/index.ts';
import { store, useCollection, usePrefs } from '../../../store/index.ts';
import { IconBolt, cx, toast } from '../../../ui/index.ts';
import shared from '../shared/panel.module.css';
import { useNow } from '../shared/useNow.ts';
import {
  ENERGY_LEVELS,
  checkInTags,
  currentCheckIn,
  energyCurve,
  levelOf,
  recentCheckInCount,
  tasksForEnergy,
} from './energy.ts';
import styles from './EnergyCheckIn.module.css';

/** Hours shown on the curve: the waking day, wide enough for early and late chronotypes. */
const FIRST_HOUR = 6;
const LAST_HOUR = 23;

export function EnergyCheckIn() {
  const t = useT();
  const format = useFormat();
  const now = useNow();
  const headingId = useId();
  const journal = useCollection('journal');
  const tasks = useCollection('tasks');
  const current = currentCheckIn(journal, now);
  const level = current ? levelOf(current) : undefined;

  const checkIn = (next: Energy) => {
    const { timeZone } = store.prefs();
    const entry = store.create('journal', {
      kind: 'dump',
      text: t('lab.energy.entry', { level: t(`lab.energy.level.${next}` as MessageKey) }),
      tags: checkInTags(next, Date.now(), timeZone),
    });
    toast({
      title: t('lab.energy.saved'),
      tone: 'success',
      action: { label: t('common.undo'), onClick: () => store.remove('journal', entry.id) },
    });
  };

  return (
    <section className={shared.panel} aria-labelledby={headingId}>
      <header className={shared.header}>
        <h3 className={shared.heading} id={headingId}>
          {t('lab.energy.heading')}
        </h3>
        {current ? (
          <p className={shared.muted}>
            {t('lab.energy.last', { when: format.relativeTime(current.createdAt, now) })}
          </p>
        ) : null}
      </header>

      <div role="group" aria-label={t('lab.energy.levels')} className={styles.levels}>
        {ENERGY_LEVELS.map((value) => (
          <button
            key={value}
            type="button"
            className={cx(styles.level, 'px-press')}
            data-level={value}
            aria-pressed={level === value}
            onClick={() => checkIn(value)}
          >
            <span className={styles.meter} aria-hidden="true">
              {ENERGY_LEVELS.map((step, i) => (
                <span
                  key={step}
                  className={styles.tick}
                  data-on={i <= ENERGY_LEVELS.indexOf(value) || undefined}
                />
              ))}
            </span>
            <span className={styles.levelLabel}>{t(`lab.energy.level.${value}` as MessageKey)}</span>
            <span className={styles.levelHint}>
              {t(`lab.energy.levelHint.${value}` as MessageKey)}
            </span>
          </button>
        ))}
      </div>

      {level ? <Fits tasks={tasks} level={level} /> : null}
      <Curve />
    </section>
  );
}

function Fits({ tasks, level }: { tasks: readonly Task[]; level: Energy }) {
  const t = useT();
  const format = useFormat();
  const fits = tasksForEnergy(tasks, level);
  return (
    <div className={cx(shared.section, 'px-rise-in')} aria-live="polite">
      <p className={shared.label}>{t('lab.energy.fits')}</p>
      {fits.length === 0 ? (
        <p className={shared.muted}>{t('lab.energy.fitsEmpty')}</p>
      ) : (
        <ul className={cx(shared.list, 'px-stagger')}>
          {fits.map((task, i) => (
            <li key={task.id} className={styles.fit} style={{ '--i': i } as CSSProperties}>
              <span className={shared.icon} aria-hidden="true">
                {task.icon ?? <IconBolt size={14} />}
              </span>
              <span className={styles.fitTitle}>{task.title}</span>
              {task.estimateMin ? (
                <span className={cx(shared.muted, shared.tabular)}>
                  {format.duration(task.estimateMin)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Curve() {
  const t = useT();
  const format = useFormat();
  const prefs = usePrefs();
  const { chronotype } = useAppPrefs();
  const tasks = useCollection('tasks');
  const journal = useCollection('journal');
  const now = useNow();
  const curve = useMemo(
    () => energyCurve({ tasks, journal, now, timeZone: prefs.timeZone, chronotype }),
    [tasks, journal, now, prefs.timeZone, chronotype],
  );
  const hours = curve.cells.slice(FIRST_HOUR, LAST_HOUR + 1);
  const peak = curve.peak;
  const nowHour = Number(format.time(now).slice(0, 2));
  const count = recentCheckInCount(journal, now);

  return (
    <figure className={styles.curve}>
      <figcaption className={styles.curveHead}>
        <span className={shared.label}>{t('lab.energy.curve')}</span>
        {peak !== null ? (
          <span className={cx(styles.peak, shared.tabular)}>
            {t('lab.energy.peak', { hour: peak })}
          </span>
        ) : null}
      </figcaption>
      <ol className={styles.bars} aria-label={t('lab.energy.curve')}>
        {hours.map((cell) => {
          const label = t('lab.energy.hourA11y', {
            hour: cell.hour,
            percent: format.percent(cell.value),
          });
          return (
            <li
              key={cell.hour}
              className={styles.bar}
              data-peak={cell.hour === peak || undefined}
              data-now={cell.hour === nowHour || undefined}
              title={label}
              aria-label={label}
            >
              <span
                className={styles.fill}
                style={{ '--v': Math.max(0.04, cell.value) } as CSSProperties}
              />
            </li>
          );
        })}
      </ol>
      <div className={cx(styles.axis, shared.tabular)} aria-hidden="true">
        <span>{FIRST_HOUR} h</span>
        <span>12 h</span>
        <span>18 h</span>
        <span>{LAST_HOUR} h</span>
      </div>
      <p className={shared.muted}>
        {t('lab.energy.checkIns', { count })} · {t('lab.energy.curveHint')}
      </p>
    </figure>
  );
}
