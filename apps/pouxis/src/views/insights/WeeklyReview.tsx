import { useState, type CSSProperties } from 'react';
import { dayKey, type insights } from '@pouxis/core';
import { useFormat, useT } from '../../i18n/index.ts';
import { usePrefs } from '../../store/index.ts';
import {
  Button,
  Card,
  IconButton,
  IconChevronLeft,
  IconChevronRight,
  IconShare,
  IconSparkle,
  toast,
} from '../../ui/index.ts';
import { suggestionMessage, type BlockerView } from './model.ts';
import { reviewImageSvg, shareImage, svgToPng } from './shareImage.ts';
import s from './Insights.module.css';

export interface WeeklyReviewProps {
  review: insights.WeeklyReview;
  blockers: readonly BlockerView[];
  /** True on the Sunday of the current week (7.9: the report is "ready"). */
  ready: boolean;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  index?: number;
}

/** Sunday report (7.9): wins first and ending on the biggest, recurring blockers, planning, ideas. */
export function WeeklyReview({
  review,
  blockers,
  ready,
  weekOffset,
  onWeekChange,
  index = 0,
}: WeeklyReviewProps) {
  const t = useT();
  const f = useFormat();
  const { timeZone } = usePrefs();
  const [sharing, setSharing] = useState(false);
  const { stats, planning } = review;
  const weekLabel = t('insights.weekly.subtitle', { date: f.date(review.week.start, 'dayMonth') });
  const statItems = [
    { label: t('insights.weekly.focusTime'), value: f.duration(stats.focusMinutes) },
    { label: t('insights.weekly.completed'), value: f.number(stats.completed) },
    {
      label: t('insights.weekly.creationShare'),
      value: stats.ratio === null ? '—' : f.percent(stats.ratio),
    },
  ];
  const suggestions = review.suggestions.map((x) =>
    suggestionMessage(x, (r) => f.percent(r), blockers),
  );

  const share = async () => {
    setSharing(true);
    try {
      const svg = reviewImageSvg({
        eyebrow: weekLabel,
        title: t('insights.weekly.shareTitle'),
        stats: statItems,
        winsTitle: t('insights.weekly.wins'),
        wins: review.wins.map((w) => w.title || t('insights.untitled')),
        winsEmpty: t('insights.weekly.winsEmpty'),
        blockersTitle: t('insights.weekly.blockers'),
        blockers: blockers.map((b) => b.label),
        suggestionsTitle: t('insights.weekly.suggestions'),
        suggestions: suggestions.map((m) => t(m.key, m.vars)),
        footer: t('insights.weekly.imageFooter'),
        theme: currentTheme(),
      });
      const png = await svgToPng(svg);
      const day = dayKey(review.week.start, timeZone);
      const how = await shareImage(png, `pouxis-${day}.png`, t('insights.weekly.shareTitle'));
      if (how === 'downloaded') {
        toast({ title: t('insights.weekly.shared'), description: t('insights.weekly.sharedBody') });
      }
    } catch (error) {
      // The user closing the share sheet is not a failure.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        toast({ title: t('insights.weekly.shareFailed'), tone: 'danger' });
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Card
      as="section"
      variant="elevated"
      padding="lg"
      aria-labelledby="insights-review-title"
      className={[s.card, s.reveal, s.review].join(' ')}
      style={{ '--i': index } as CSSProperties}
    >
      <header className={s.reviewHead}>
        <div className={s.cardTitles}>
          {ready ? (
            <span className={s.ready}>
              <IconSparkle size={14} aria-hidden="true" />
              {t('insights.weekly.ready')}
            </span>
          ) : (
            <span className={s.eyebrow}>{t('insights.weekly.title')}</span>
          )}
          <h2 id="insights-review-title" className={s.reviewTitle}>
            {weekLabel}
          </h2>
        </div>
        <div className={s.reviewTools}>
          <nav className={s.weekNav} aria-label={t('insights.week.label')}>
            <IconButton
              label={t('insights.week.previous')}
              icon={<IconChevronLeft />}
              onClick={() => onWeekChange(weekOffset - 1)}
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={weekOffset === 0}
              onClick={() => onWeekChange(0)}
            >
              {t('insights.week.current')}
            </Button>
            <IconButton
              label={t('insights.week.next')}
              icon={<IconChevronRight />}
              disabled={weekOffset >= 0}
              onClick={() => onWeekChange(weekOffset + 1)}
            />
          </nav>
          <Button iconStart={<IconShare />} loading={sharing} onClick={() => void share()}>
            {t('insights.weekly.share')}
          </Button>
        </div>
      </header>

      <dl className={s.stats}>
        {statItems.map((x) => (
          <div key={x.label} className={s.stat}>
            <dt>{x.label}</dt>
            <dd>{x.value}</dd>
          </div>
        ))}
      </dl>

      <div className={s.columns}>
        <section className={s.block} aria-labelledby="insights-wins">
          <h3 id="insights-wins" className={s.blockTitle}>
            {t('insights.weekly.wins')}
          </h3>
          {review.wins.length === 0 ? (
            <p className={s.muted}>{t('insights.weekly.winsEmpty')}</p>
          ) : (
            <ol className={s.list}>
              {review.wins.map((w, i) => {
                const peak = i === review.wins.length - 1;
                return (
                  <li key={`${w.kind}-${w.id}`} className={peak ? `${s.win} ${s.winPeak}` : s.win}>
                    <span className={s.winBody}>
                      {peak ? (
                        <span className={s.winTag}>{t('insights.weekly.biggestWin')}</span>
                      ) : null}
                      <span>{w.title || t('insights.untitled')}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className={s.block}>
          <section className={s.block} aria-labelledby="insights-blockers">
            <h3 id="insights-blockers" className={s.blockTitle}>
              {t('insights.weekly.blockers')}
            </h3>
            {blockers.length === 0 ? (
              <p className={s.muted}>{t('insights.weekly.blockersEmpty')}</p>
            ) : (
              <ul className={s.list}>
                {blockers.map((b) => (
                  <li key={b.key} className={s.blocker}>
                    <q className={s.blockerQuote}>{b.label}</q>
                    <span className={s.staleMeta}>
                      {t('insights.weekly.blockerCount', { count: b.count, week: b.thisWeek })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={s.block} aria-labelledby="insights-planning">
            <h3 id="insights-planning" className={s.blockTitle}>
              {t('insights.weekly.planning')}
            </h3>
            <PlanningAccuracy planning={planning} />
            {review.slipped.length > 0 ? (
              <p className={s.muted}>
                {t('insights.weekly.slipped', { count: review.slipped.length })}
              </p>
            ) : null}
          </section>
        </div>
      </div>

      {suggestions.length > 0 ? (
        <section className={s.block} aria-labelledby="insights-suggestions">
          <h3 id="insights-suggestions" className={s.blockTitle}>
            {t('insights.weekly.suggestions')}
          </h3>
          <ul className={s.suggestions}>
            {suggestions.map((m) => (
              <li key={m.key} className={s.suggestion}>
                <IconSparkle size={16} aria-hidden="true" />
                <span>{t(m.key, m.vars)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Card>
  );
}

/** Estimate accuracy (1.9) as words plus a small ratio scale (50 %–200 %, 100 % marked). */
function PlanningAccuracy({ planning }: { planning: insights.PlanningAccuracy }) {
  const t = useT();
  const f = useFormat();
  const { estimates, scheduled } = planning;
  if (!estimates && !scheduled)
    return <p className={s.muted}>{t('insights.weekly.planningEmpty')}</p>;

  return (
    <div className={s.planning}>
      {estimates ? (
        <>
          <p className={s.muted}>
            {t('insights.weekly.planningEstimates', {
              ratio: f.percent(estimates.medianRatio),
              within: f.percent(estimates.withinQuarter),
            })}
          </p>
          <div className={s.ratio}>
            <RatioScale ratio={estimates.medianRatio} />
            {/* Visual axis only: the sentence above already states the ratio in words. */}
            <div className={s.ratioAxis} aria-hidden="true">
              <span>{t('insights.weekly.scaleShort')}</span>
              <span>{t('insights.weekly.scaleExact')}</span>
              <span>{t('insights.weekly.scaleLong')}</span>
            </div>
          </div>
        </>
      ) : null}
      {scheduled ? (
        <p className={s.muted}>
          {t('insights.weekly.planningScheduled', {
            done: scheduled.done,
            planned: scheduled.planned,
          })}
        </p>
      ) : null}
    </div>
  );
}

/** Position of `ratio` on a log scale from 0.5 to 2 (1 sits in the middle). */
export function ratioPosition(ratio: number): number {
  const clamped = Math.min(2, Math.max(0.5, ratio));
  return (Math.log2(clamped) + 1) / 2;
}

function RatioScale({ ratio }: { ratio: number }) {
  const x = 8 + ratioPosition(ratio) * 284;
  return (
    <svg className={s.ratioScale} viewBox="0 0 300 28" aria-hidden="true" focusable="false">
      <line
        x1="8"
        y1="14"
        x2="292"
        y2="14"
        stroke="var(--line-strong)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="150"
        y1="6"
        x2="150"
        y2="22"
        stroke="var(--ink-3)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx={x} cy="14" r="7" fill="var(--viz-1)" stroke="var(--surface)" strokeWidth="2" />
    </svg>
  );
}

function currentTheme(): 'light' | 'dark' {
  const root = document.documentElement.dataset['theme'];
  if (root === 'light' || root === 'dark') return root;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
