import { useMemo, useState } from 'react';
import { dayKey } from '@pouxis/core';
import { useT } from '../../i18n/index.ts';
import { useCollection, usePrefs } from '../../store/index.ts';
import { EmptyState, IconInsights, IconLock } from '../../ui/index.ts';
import { BalanceChart } from './BalanceChart.tsx';
import { EnergyHeatmap } from './EnergyHeatmap.tsx';
import { SkillTree } from './SkillTree.tsx';
import { StaleList } from './StaleList.tsx';
import { StreakCard } from './StreakCard.tsx';
import { WeeklyReview } from './WeeklyReview.tsx';
import { computeInsights, isEmpty } from './model.ts';
import s from './Insights.module.css';

export interface InsightsViewProps {
  /** Reference time, for tests and previews. Defaults to the time the view opened. */
  now?: number;
}

/** Insights (module 7): local telemetry that describes, never judges. */
export default function InsightsView({ now: fixedNow }: InsightsViewProps = {}) {
  const t = useT();
  const { timeZone } = usePrefs();
  const tasks = useCollection('tasks');
  const events = useCollection('events');
  const journal = useCollection('journal');
  const notes = useCollection('notes');
  const [openedAt] = useState(() => Date.now());
  const now = fixedNow ?? openedAt;
  const [weekOffset, setWeekOffset] = useState(0);

  const model = useMemo(
    () => computeInsights({ tasks, events, journal, notes, now, timeZone, weekOffset }),
    [tasks, events, journal, notes, now, timeZone, weekOffset],
  );
  const today = dayKey(now, timeZone);

  return (
    <div className={s.page}>
      <header className={s.header}>
        <span className={s.eyebrow}>
          <IconLock size={14} aria-hidden="true" />
          {t('insights.privacy')}
        </span>
        <h1 className={s.title}>{t('insights.title')}</h1>
        <p className={s.lede}>{t('insights.subtitle')}</p>
      </header>

      {isEmpty(model) ? (
        <EmptyState
          icon={<IconInsights size={32} />}
          title={t('insights.empty.title')}
          description={t('insights.empty.body')}
        />
      ) : (
        <div className={s.grid}>
          <div className={s.span12}>
            <WeeklyReview
              review={model.review}
              blockers={model.blockers}
              ready={model.reviewReady}
              weekOffset={weekOffset}
              onWeekChange={(o) => setWeekOffset(Math.min(0, o))}
              index={0}
            />
          </div>
          <div className={s.span7}>
            <EnergyHeatmap energy={model.energy} index={1} />
          </div>
          <div className={s.span5}>
            <StreakCard streak={model.streak} strip={model.strip} index={2} />
          </div>
          <div className={s.span5}>
            <BalanceChart balance={model.balance} today={today} index={3} />
          </div>
          <div className={s.span7}>
            <SkillTree root={model.skills} index={4} />
          </div>
          <div className={s.span6}>
            <StaleList variant="deadEnds" items={model.deadEnds} index={5} />
          </div>
          <div className={s.span6}>
            <StaleList variant="archive" items={model.archive} index={6} />
          </div>
        </div>
      )}
    </div>
  );
}
