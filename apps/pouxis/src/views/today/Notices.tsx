import type { ReactNode } from 'react';
import type { Interval } from '@pouxis/core';
import type { EventDraft } from '@pouxis/core/scheduler';
import { useT, useFormat } from '../../i18n/index.ts';
import { Button, IconAlert, IconClock, IconLayers, cx } from '../../ui/index.ts';
import type { TimelineItem } from './model.ts';
import type { MakerWarning } from './planner.ts';
import s from './Today.module.css';

function Notice(props: {
  icon: ReactNode;
  title: string;
  tone?: 'warning' | 'calm';
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <section className={cx(s.notice, props.tone === 'warning' && s.noticeWarning, 'px-rise-in')}>
      <span className={s.noticeIcon} aria-hidden="true">
        {props.icon}
      </span>
      <div className={s.noticeBody}>
        <h2 className={s.noticeTitle}>{props.title}</h2>
        {props.children}
        <div className={s.noticeActions}>{props.actions}</div>
      </div>
    </section>
  );
}

export interface OverrunNoticeProps {
  item: TimelineItem;
  /** Minutes past the planned end. */
  overMin: number;
  /** Minutes the overrunning slot is extended by. */
  extendMin: number;
  moved: number;
  overflow: number;
  onPropagate: () => void;
  onWrapUp: () => void;
  onKeep: () => void;
}

/** A slot ran over (1.2): preview on the timeline, one tap to shift what follows. */
export function OverrunNotice(p: OverrunNoticeProps) {
  const t = useT();
  const f = useFormat();
  return (
    <Notice
      icon={<IconClock size={18} />}
      tone="warning"
      title={t('today.overrun.title', { title: p.item.title })}
      actions={
        <>
          <Button size="sm" variant="primary" onClick={p.onPropagate}>
            {p.moved > 0
              ? t('today.overrun.propagate')
              : t('today.overrun.extend', { duration: f.duration(p.extendMin) })}
          </Button>
          <Button size="sm" variant="secondary" onClick={p.onWrapUp}>
            {t('today.overrun.wrapUp')}
          </Button>
          <Button size="sm" variant="ghost" onClick={p.onKeep}>
            {t('today.overrun.keep')}
          </Button>
        </>
      }
    >
      <p className={s.noticeText}>
        {t('today.overrun.body', { duration: f.duration(Math.max(1, p.overMin)) })}
      </p>
      {p.moved > 0 && <p className={s.noticeNote}>{t('today.overrun.preview')}</p>}
      {p.overflow > 0 && (
        <p className={s.noticeNote}>
          {t('today.overrun.overflow', { count: p.overflow })} {t('today.overrun.overflowHint')}
        </p>
      )}
      <p className={s.noticeNote}>{t('today.overrun.fixedNote')}</p>
    </Notice>
  );
}

export interface MakerNoticeProps {
  warning: MakerWarning;
  onMove: (slot: Interval) => void;
  onKeep: () => void;
}

/** A meeting splits the day's deep-work block (1.15). */
export function MakerNotice({ warning, onMove, onKeep }: MakerNoticeProps) {
  const t = useT();
  const f = useFormat();
  const block = warning.check.fragmented;
  const before = block ? (warning.event.start - block.start) / 60_000 : 0;
  const after = block ? (block.end - warning.event.end) / 60_000 : 0;
  const alt = warning.alternatives[0];
  return (
    <Notice
      icon={<IconAlert size={18} />}
      title={t('today.maker.title')}
      actions={
        <>
          {alt && (
            <Button size="sm" variant="secondary" onClick={() => onMove(alt)}>
              {t('today.maker.move', { time: f.time(alt.start) })}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onKeep}>
            {t('today.maker.keep')}
          </Button>
        </>
      }
    >
      <p className={s.noticeText}>
        <strong>{warning.event.title}</strong> ·{' '}
        {f.timeRange(warning.event.start, warning.event.end)}
      </p>
      <p className={s.noticeText}>
        {t('today.maker.body', {
          before: f.duration(Math.max(0, before)),
          after: f.duration(Math.max(0, after)),
        })}
      </p>
      {!alt && <p className={s.noticeNote}>{t('today.maker.noSuggestion')}</p>}
    </Notice>
  );
}

export interface BuffersNoticeProps {
  drafts: readonly EventDraft[];
  bufferMin: number;
  onAdd: () => void;
  onDismiss: () => void;
}

/** Back-to-back meetings without a breather (1.6): suggested buffers are drawn dashed. */
export function BuffersNotice({ drafts, bufferMin, onAdd, onDismiss }: BuffersNoticeProps) {
  const t = useT();
  const f = useFormat();
  return (
    <Notice
      icon={<IconLayers size={18} />}
      tone="calm"
      title={`${t('today.buffers.suggested')} · ${drafts.length} × ${f.duration(bufferMin)}`}
      actions={
        <>
          <Button size="sm" variant="secondary" onClick={onAdd}>
            {t('today.buffers.add')}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            {t('today.overrun.keep')}
          </Button>
        </>
      }
    >
      <p className={s.noticeText}>{t('today.buffers.hint')}</p>
    </Notice>
  );
}
