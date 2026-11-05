import type { CSSProperties } from 'react';
import type { Id, Task } from '@pouxis/core';
import type { Decay } from '@pouxis/core/tasks';
import { useT, useFormat } from '../../i18n/index.ts';
import { Button, IconButton, IconPlay, IconSparkle, cx } from '../../ui/index.ts';
import { DEFAULT_ESTIMATE_MIN } from './planner.ts';
import { TASK_DRAG_TYPE, transitionName } from './Timeline.tsx';
import s from './Today.module.css';

export interface TrayProps {
  tasks: readonly Task[];
  decayOf: (task: Task) => Decay;
  onPlace: (taskId: Id) => void;
  onPlaceAll: () => void;
  onFocus: (taskId: Id) => void;
}

/**
 * Floating tasks of the day (1.10): no time yet. Each can be dragged onto a free gap, or
 * magnetised into the best one.
 */
export function Tray({ tasks, decayOf, onPlace, onPlaceAll, onFocus }: TrayProps) {
  const t = useT();
  const f = useFormat();
  return (
    <section className={s.tray} aria-labelledby="today-tray-title">
      <div className={s.railHead}>
        <h2 id="today-tray-title" className={s.railTitle}>
          {t('today.floating.title')}
        </h2>
        <span className={s.count}>{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <p className={s.muted}>{t('today.floating.empty')}</p>
      ) : (
        <>
          <p className={s.muted}>{t('today.floating.dragHint')}</p>
          <ul className={cx(s.trayList, 'px-stagger')}>
            {tasks.map((task, i) => {
              const decay = decayOf(task);
              const aging = decay.state !== 'fresh';
              return (
                <li
                  key={task.id}
                  className={cx(s.trayItem, aging && s.aging)}
                  data-cat={task.color ?? (task.mode === 'create' ? 1 : 2)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(TASK_DRAG_TYPE, task.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  style={
                    {
                      '--i': i,
                      '--decay': aging ? decay.level : 0,
                      viewTransitionName: transitionName(task.id),
                    } as CSSProperties
                  }
                >
                  <span className={s.blockIcon} aria-hidden="true">
                    {task.icon ?? (task.mode === 'create' ? '✏️' : '📋')}
                  </span>
                  <span className={s.blockText}>
                    <span className={s.blockTitle}>{task.title}</span>
                    <span className={s.blockMeta}>
                      <span>{f.duration(task.estimateMin ?? DEFAULT_ESTIMATE_MIN)}</span>
                      {aging && (
                        <span className={s.metaTag}>
                          {t(decay.state === 'stale' ? 'today.decay.stale' : 'today.decay.aging')}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className={s.blockActions}>
                    <IconButton
                      size="sm"
                      label={t('today.focus.startOn', { title: task.title })}
                      icon={<IconPlay size={16} />}
                      onClick={() => onFocus(task.id)}
                    />
                    <IconButton
                      size="sm"
                      label={`${t('today.floating.place')} — ${task.title}`}
                      icon={<IconSparkle size={16} />}
                      onClick={() => onPlace(task.id)}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
          {tasks.length > 1 && (
            <Button variant="secondary" size="sm" fullWidth onClick={onPlaceAll}>
              {t('today.floating.placeAll')}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
