/** Compact metadata line of a task: when, how long, progress, blockers, decay, tags. */
import type { ReactNode } from 'react';
import { tasks as engine, type Task } from '@pouxis/core';
import { IconClock, IconFlag, IconLock, IconRepeat } from '../../ui/index.ts';
import { useTasks } from './context.ts';
import { plannedAt } from './model.ts';
import s from './Tasks.module.css';

export function whenLabel(
  task: Task,
  ctx: Pick<ReturnType<typeof useTasks>, 't' | 'fmt' | 'now'>,
): string | null {
  const { t, fmt, now } = ctx;
  if (task.deadline !== undefined) {
    return t('tasks.detail.due', { when: fmt.relativeDay(task.deadline, now) });
  }
  const planned = plannedAt(task);
  if (planned === undefined) return null;
  const day = fmt.relativeDay(planned, now);
  return task.scheduled ? `${day} · ${fmt.time(task.scheduled.start)}` : day;
}

export function TaskMeta({ task, showTags = true }: { task: Task; showTags?: boolean }) {
  const ctx = useTasks();
  const { t, fmt, prefs, now, all, byId } = ctx;
  const when = whenLabel(task, ctx);
  const progress = engine.subtaskProgress(task.id, all);
  const blockers = engine.isOpen(task) ? engine.blockers(task, byId) : [];
  const decay = engine.isOpen(task) ? engine.decay(task, prefs, now) : null;
  const items: ReactNode[] = [];

  if (task.priority === 3) {
    items.push(
      <span key="prio" className={s.metaPriority}>
        <IconFlag aria-hidden="true" />
        {t('common.priority.high')}
      </span>,
    );
  }
  if (when) items.push(<span key="when">{when}</span>);
  if (task.estimateMin !== undefined) {
    items.push(
      <span key="est" aria-label={fmt.duration(task.estimateMin, 'long')}>
        <IconClock aria-hidden="true" />
        {fmt.duration(task.estimateMin, 'compact')}
      </span>,
    );
  }
  if (task.recurrence) {
    items.push(
      <span key="rec" aria-label={t('tasks.fields.recurrence')}>
        <IconRepeat aria-hidden="true" />
      </span>,
    );
  }
  if (progress.total > 0) {
    items.push(
      <span key="sub" aria-label={t('tasks.subtasks.progressA11y', progress)} className={s.tabular}>
        {t('tasks.subtasks.progress', progress)}
      </span>,
    );
  }
  if (blockers.length > 0) {
    const first = blockers[0];
    items.push(
      <span key="blk" className={s.metaBlocked}>
        <IconLock aria-hidden="true" />
        {blockers.length === 1 && first
          ? t('tasks.dependencies.waitingOn', { title: first.title })
          : t('tasks.dependencies.waitingOnMany', { count: blockers.length })}
      </span>,
    );
  }
  if (decay && decay.state !== 'fresh' && task.postponedCount > 0) {
    items.push(
      <span key="decay" className={s.metaDecay} title={t('tasks.decay.hint')}>
        {t('tasks.decay.postponed', { count: task.postponedCount })}
      </span>,
    );
  }
  if (showTags) {
    for (const tag of task.tags.slice(0, 3)) {
      items.push(
        <span key={`tag-${tag}`} className={s.metaTag}>
          #{tag}
        </span>,
      );
    }
  }
  if (items.length === 0) return null;
  return <span className={s.meta}>{items}</span>;
}
