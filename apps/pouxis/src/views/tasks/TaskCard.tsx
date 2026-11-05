/** Draggable task card shared by the kanban board and the Eisenhower matrix. */
import type { ReactNode } from 'react';
import type { Task } from '@pouxis/core';
import { IconGrip, Portal, cx } from '../../ui/index.ts';
import { useTasks } from './context.ts';
import { TaskMeta } from './TaskMeta.tsx';
import type { DragState, useDragDrop } from './useDragDrop.ts';
import s from './Tasks.module.css';

type Dnd = ReturnType<typeof useDragDrop>;

export interface TaskCardProps {
  task: Task;
  zone: string;
  dnd: Dnd;
  /** Id of the element holding the keyboard drag instructions. */
  instructionsId: string;
  footer?: ReactNode;
}

export function TaskCard({ task, zone, dnd, instructionsId, footer }: TaskCardProps) {
  const { t, openTask } = useTasks();
  const dragging = dnd.drag?.id === task.id;
  return (
    <li
      className={cx(s.card, dragging && s.cardDragging)}
      data-priority={task.priority}
      data-mode={task.mode}
      {...dnd.itemPointerProps(task.id, zone)}
    >
      <button
        type="button"
        className={s.cardHandle}
        aria-label={t('tasks.dnd.handle', { title: task.title })}
        aria-describedby={instructionsId}
        {...dnd.handleKeyProps(task.id, zone)}
      >
        <IconGrip aria-hidden="true" />
      </button>
      <button type="button" className={s.cardMain} onClick={() => openTask(task.id)}>
        <span className={cx(s.cardTitle, task.status === 'done' && s.rowDone)}>{task.title}</span>
        <TaskMeta task={task} />
      </button>
      {footer}
    </li>
  );
}

/** Floating copy of the card under the pointer while dragging. */
export function DragGhost({ drag, task }: { drag: DragState | null; task: Task | undefined }) {
  if (!drag || drag.via !== 'pointer' || !task) return null;
  return (
    <Portal>
      <div
        className={s.ghost}
        aria-hidden="true"
        style={{
          width: drag.width,
          transform: `translate3d(${drag.x - drag.dx}px, ${drag.y - drag.dy}px, 0) rotate(-1.5deg)`,
        }}
      >
        <span className={s.cardTitle}>{task.title}</span>
      </div>
    </Portal>
  );
}
