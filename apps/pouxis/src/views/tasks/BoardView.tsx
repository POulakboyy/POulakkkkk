/** Kanban board (2.12): columns from `tasks.toBoard`, cards moved by pointer or keyboard. */
import { useId, useState } from 'react';
import { tasks as engine, type Task } from '@pouxis/core';
import { DESKTOP_QUERY, SegmentedControl, useMediaQuery } from '../../ui/index.ts';
import { completeTask } from './actions.ts';
import { useTasks } from './context.ts';
import { BOARD_GROUPS, BOARD_GROUP_LABEL, columnLabel, type BoardGroup } from './labels.ts';
import { isTopLevel } from './model.ts';
import { DragGhost, TaskCard } from './TaskCard.tsx';
import { useDragDrop } from './useDragDrop.ts';
import s from './Tasks.module.css';

/** Drop-zone ids are prefixed: the « none » column key is the empty string. */
const ZONE = 'col:';
const toZone = (key: string) => ZONE + key;
const fromZone = (zone: string) => zone.slice(ZONE.length);

export function BoardView({ visible }: { visible: readonly Task[] }) {
  const ctx = useTasks();
  const { t, now, byId } = ctx;
  const [group, setGroup] = useState<BoardGroup>('status');
  const instructionsId = useId();
  const wide = useMediaQuery(DESKTOP_QUERY);
  const cards = visible.filter((task) => isTopLevel(task, byId));
  const board = engine.toBoard(cards, group, { now });
  const zones = board.columns.map((c) => toZone(c.key));

  const label = (key: string) => {
    const k = columnLabel(group, key);
    return k ? t(k) : `#${key}`;
  };
  const title = (id: string) => byId.get(id)?.title ?? '';

  const dnd = useDragDrop({
    zones,
    announce: ctx.announce,
    describe: {
      grabbed: (id, zone) =>
        t('tasks.dnd.grabbed', { title: title(id), zone: label(fromZone(zone)) }),
      over: (zone) => t('tasks.dnd.over', { zone: label(fromZone(zone)) }),
      dropped: (id, zone) =>
        t('tasks.dnd.dropped', { title: title(id), zone: label(fromZone(zone)) }),
      cancelled: () => t('tasks.dnd.cancelled'),
    },
    onDrop: (id, zone) => {
      const task = byId.get(id);
      if (!task) return;
      const key = fromZone(zone);
      if (group === 'status' && key === 'done') return completeTask(task, t, now);
      const fromColumn = board.columns.find((c) => c.tasks.includes(task))?.key;
      const move = engine.moveCardPatch(task, key, group, {
        now,
        ...(fromColumn !== undefined && { fromColumn }),
      });
      if (!move.ok || Object.keys(move.patch).length === 0) return;
      ctx.save(task, move.patch, t('tasks.toast.moved', { list: label(key) }));
    },
  });

  return (
    <div className={s.boardWrap}>
      <div className={s.boardBar}>
        <SegmentedControl
          size="sm"
          label={t('tasks.kanban.groupBy')}
          options={BOARD_GROUPS.map((g) => ({
            value: g,
            label: t(
              !wide && g === 'mode'
                ? 'tasks.kanban.groupByOptions.modeShort'
                : BOARD_GROUP_LABEL[g],
            ),
          }))}
          value={group}
          onChange={setGroup}
        />
      </div>
      <p id={instructionsId} hidden>
        {t('tasks.dnd.instructions')}
      </p>
      <div className={s.board}>
        {board.columns.map((column) => {
          const zone = toZone(column.key);
          return (
            <section
              key={zone}
              className={s.column}
              aria-label={label(column.key)}
              {...dnd.zoneProps(zone)}
            >
              <header className={s.columnHeader}>
                <h2 className={s.columnTitle}>{label(column.key)}</h2>
                <span className={s.groupCount}>{column.tasks.length}</span>
              </header>
              {column.tasks.length === 0 ? (
                <p className={s.columnEmpty}>
                  {t(dnd.drag ? 'tasks.kanban.dropHere' : 'tasks.kanban.columnEmpty')}
                </p>
              ) : (
                <ul className={s.cards} role="list">
                  {column.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      zone={zone}
                      dnd={dnd}
                      instructionsId={instructionsId}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <DragGhost drag={dnd.drag} task={dnd.drag ? byId.get(dnd.drag.id) : undefined} />
    </div>
  );
}
