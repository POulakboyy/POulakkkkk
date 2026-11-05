import { useEffect, useId, useState } from 'react';
import { MINUTE, type Id } from '@pouxis/core';
import { useFormat, useT } from '../../../i18n/index.ts';
import { store, useCollection, usePrefs } from '../../../store/index.ts';
import {
  Button,
  Card,
  IconClock,
  ProgressBar,
  ProgressRing,
  SegmentedControl,
  cx,
  toast,
} from '../../../ui/index.ts';
import shared from '../shared/panel.module.css';
import { useNow } from '../shared/useNow.ts';
import {
  DEFAULT_RHYTHM,
  RHYTHMS,
  RHYTHM_IDS,
  breakLog,
  focusStretch,
  isRhythmId,
  isSnoozed,
  suggestBreak,
  untilNextBreak,
  type BreakSuggestion,
  type RhythmId,
} from './breaks.ts';
import styles from './BreakCoach.module.css';

const RHYTHM_KEY = 'pouxis:lab:break-rhythm';

function readRhythm(): RhythmId {
  try {
    const raw = globalThis.localStorage?.getItem(RHYTHM_KEY);
    return isRhythmId(raw) ? raw : DEFAULT_RHYTHM;
  } catch {
    return DEFAULT_RHYTHM;
  }
}

function writeRhythm(value: RhythmId): void {
  try {
    globalThis.localStorage?.setItem(RHYTHM_KEY, value);
  } catch {
    // Storage unavailable (private mode): the choice lasts for this session only.
  }
}

interface RunningBreak {
  start: number;
  end: number;
  taskId?: Id;
}

export function BreakCoach() {
  const t = useT();
  const format = useFormat();
  const prefs = usePrefs();
  const headingId = useId();
  const tasks = useCollection('tasks');
  const [rhythm, setRhythm] = useState<RhythmId>(readRhythm);
  const [running, setRunning] = useState<RunningBreak | null>(null);
  const [snoozedAt, setSnoozedAt] = useState<number | undefined>();
  const now = useNow(running ? 1_000 : 30_000);

  const active = RHYTHMS[rhythm === 'free' ? DEFAULT_RHYTHM : rhythm];
  const stretch = focusStretch(tasks, now, prefs.timeZone, active.restMin);
  const suggestion = isSnoozed(stretch, snoozedAt) ? undefined : suggestBreak(stretch, rhythm);
  const left = untilNextBreak(stretch, rhythm);

  const chooseRhythm = (value: RhythmId) => {
    setRhythm(value);
    writeRhythm(value);
  };

  const finish = (at: number) => {
    if (!running) return;
    const task = running.taskId ? store.get('tasks', running.taskId) : undefined;
    if (task) {
      store.update('tasks', task.id, {
        timeLogs: [...task.timeLogs, breakLog(running.start, Math.min(at, running.end))],
      });
    }
    setRunning(null);
    setSnoozedAt(undefined);
    toast({ title: t('lab.breaks.ended'), tone: 'success' });
  };

  useEffect(() => {
    if (running && now >= running.end) finish(running.end);
  });

  const start = (s: BreakSuggestion) => {
    const begin = Date.now();
    setRunning({ start: begin, end: begin + s.minutes * MINUTE, taskId: stretch.lastTaskId });
  };

  const rhythmOptions = RHYTHM_IDS.map((value) => ({
    value,
    label:
      value === 'free'
        ? t('lab.breaks.free')
        : t('lab.breaks.rhythmOption', {
            focus: RHYTHMS[value].focusMin,
            rest: RHYTHMS[value].restMin,
          }),
  }));

  return (
    <section className={shared.panel} aria-labelledby={headingId}>
      <h3 className="visually-hidden" id={headingId}>
        {t('lab.breaks.title')}
      </h3>

      {running ? (
        <RunningCard running={running} now={now} onEnd={() => finish(Date.now())} />
      ) : (
        <div className={styles.status}>
          {stretch.focusedToday ? (
            <p className={cx(styles.big, shared.tabular)}>
              {stretch.restingMs !== undefined ? (
                <span className={styles.bigLine}>
                  {t('lab.breaks.rested', {
                    duration: format.duration(stretch.restingMs / MINUTE),
                  })}
                </span>
              ) : (
                <>
                  <span className={styles.bigLine}>
                    {format.duration(Math.floor(stretch.focusMs / MINUTE))}
                  </span>
                  <span className={styles.bigCaption}>{t('lab.breaks.since')}</span>
                </>
              )}
            </p>
          ) : null}
          {!stretch.focusedToday ? (
            <p className={shared.muted}>{t('lab.breaks.none')}</p>
          ) : left !== undefined && left > 0 && stretch.restingMs === undefined ? (
            <ProgressBar
              label={t('lab.breaks.progress')}
              value={1 - left / (active.focusMin * MINUTE)}
              valueText={t('lab.breaks.progressValue', {
                duration: format.duration(Math.ceil(left / MINUTE)),
              })}
              showValue
            />
          ) : null}
        </div>
      )}

      {!running && suggestion ? (
        <Card variant="tinted" padding="lg" as="section" className="px-rise-in" aria-live="polite">
          <div className={styles.suggestion}>
            <p className={shared.label}>{t('lab.breaks.suggestion')}</p>
            <p className={styles.suggestionTitle}>
              {t(`lab.breaks.kind.${suggestion.kind}.title`)}
            </p>
            <p className={shared.lead}>{t(`lab.breaks.kind.${suggestion.kind}.body`)}</p>
            <div className={shared.actions}>
              <Button
                variant="primary"
                iconStart={<IconClock size={16} />}
                onClick={() => start(suggestion)}
              >
                {t('lab.breaks.start', { duration: format.duration(suggestion.minutes) })}
              </Button>
              <Button variant="ghost" onClick={() => setSnoozedAt(stretch.focusMs)}>
                {t('lab.breaks.later')}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className={shared.section}>
        <SegmentedControl
          label={t('lab.breaks.rhythm')}
          options={rhythmOptions}
          value={rhythm}
          onChange={chooseRhythm}
          size="sm"
        />
        <p className={shared.muted}>
          {rhythm === 'free' ? t('lab.breaks.freeHint') : t('lab.breaks.rhythmHint')}
        </p>
      </div>
    </section>
  );
}

interface RunningProps {
  running: RunningBreak;
  now: number;
  onEnd: () => void;
}

function RunningCard({ running, now, onEnd }: RunningProps) {
  const t = useT();
  const format = useFormat();
  const total = running.end - running.start;
  const remaining = Math.max(0, running.end - now);
  return (
    <Card variant="tinted" padding="lg" as="section" className="px-scale-in">
      <div className={styles.running}>
        <ProgressRing
          value={total > 0 ? 1 - remaining / total : 1}
          label={t('lab.breaks.remaining')}
          valueText={format.timer(Math.ceil(remaining / 1000))}
          size={136}
          tone="success"
        >
          <span className={cx(styles.timer, shared.tabular)}>
            {format.timer(Math.ceil(remaining / 1000))}
          </span>
        </ProgressRing>
        <div className={styles.runningText}>
          <p className={shared.label}>{t('lab.breaks.running')}</p>
          <Button variant="secondary" onClick={onEnd}>
            {t('lab.breaks.end')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
