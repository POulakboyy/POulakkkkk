import type { CSSProperties } from 'react';
import type { insights } from '@pouxis/core';
import { useFormat, useT, type MessageKey } from '../../i18n/index.ts';
import { ChartCard } from './ChartCard.tsx';
import { VisuallyHidden } from '../../ui/index.ts';
import { STREAK_RULES, dayNoon, type StripDay, type StripState } from './model.ts';
import s from './Insights.module.css';

const DAY_KEY: Record<StripState, MessageKey> = {
  active: 'insights.streak.dayActive',
  joker: 'insights.streak.dayJoker',
  rest: 'insights.streak.dayRest',
};

export interface StreakCardProps {
  streak: insights.Streak;
  strip: readonly StripDay[];
  index?: number;
}

/** Guilt-free streak (7.3): jokers are rings that cover rest days; a break is a pause. */
export function StreakCard({ streak, strip, index }: StreakCardProps) {
  const t = useT();
  const f = useFormat();
  const maxJokers = STREAK_RULES.maxJokers ?? 2;
  const status: MessageKey =
    streak.current === 0 && streak.status !== 'paused'
      ? 'insights.streak.status.none'
      : `insights.streak.status.${streak.status}`;
  const dateOf = (day: string) => f.date(dayNoon(day, f.timeZone), 'weekdayDayMonth');

  return (
    <ChartCard title={t('insights.streak.title')} index={index}>
      <div className={s.streakHero}>
        <p className={s.bigNumber}>{t('insights.streak.days', { count: streak.current })}</p>
        <p className={s.muted}>{t('insights.streak.best', { count: streak.best })}</p>
      </div>
      <p className={s.statusLine}>{t(status)}</p>

      <div className={s.jokers}>
        <span className={s.jokerRings} aria-hidden="true">
          {Array.from({ length: maxJokers }, (_, i) => (
            <JokerRing key={i} available={i < streak.jokersLeft} />
          ))}
        </span>
        <span>
          <b>{t('insights.streak.jokers', { count: streak.jokersLeft })}</b>
          <span className={s.muted}>
            {t('insights.streak.jokerHint', { count: STREAK_RULES.jokersPerWeek ?? 1 })}
          </span>
        </span>
      </div>

      <div className={s.block}>
        <h3 className={s.blockLabel}>{t('insights.streak.calendar', { count: strip.length })}</h3>
        <ol className={s.strip}>
          {strip.map((d, i) => {
            const label = t(DAY_KEY[d.state], { date: dateOf(d.day) });
            return (
              <li
                key={d.day}
                data-today={d.today ? 'true' : 'false'}
                style={{ '--i': i } as CSSProperties}
                aria-current={d.today ? 'date' : undefined}
              >
                <span className={s.dot} data-state={d.state} aria-hidden="true" />
                <VisuallyHidden>
                  {d.today ? `${label} (${t('insights.streak.today')})` : label}
                </VisuallyHidden>
              </li>
            );
          })}
        </ol>
        <ul className={s.legend} aria-hidden="true">
          <li>
            <span className={s.legendDot} data-state="active" />
            {t('insights.streak.legendActive')}
          </li>
          <li>
            <span className={s.legendDot} data-state="joker" />
            {t('insights.streak.legendJoker')}
          </li>
          <li>
            <span className={s.legendDot} data-state="rest" />
            {t('insights.streak.legendRest')}
          </li>
        </ul>
      </div>
    </ChartCard>
  );
}

function JokerRing({ available }: { available: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" focusable="false" data-available={available}>
      <circle
        cx="14"
        cy="14"
        r="11"
        fill="none"
        stroke={available ? 'var(--accent-strong)' : 'var(--line-control)'}
        strokeWidth="3"
        strokeDasharray={available ? undefined : '3 4'}
      />
    </svg>
  );
}
