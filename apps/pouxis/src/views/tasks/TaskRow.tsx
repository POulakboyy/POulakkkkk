/** One task of the smart list: Spark-style swipes (done / plan / delete) on a calm row. */
import type { Task } from '@pouxis/core';
import {
  Checkbox,
  IconCalendar,
  IconCheck,
  IconTrash,
  IconUndo,
  SwipeableRow,
  cx,
  type SwipeAction,
} from '../../ui/index.ts';
import { deleteTask, planPatch, toggleDone } from './actions.ts';
import { useTasks } from './context.ts';
import { nextPlanDay } from './model.ts';
import { TaskMeta } from './TaskMeta.tsx';
import s from './Tasks.module.css';

export function TaskRow({ task }: { task: Task }) {
  const ctx = useTasks();
  const { t, fmt, now, prefs } = ctx;
  const done = task.status === 'done';

  const plan = () => {
    const day = nextPlanDay(task, now, prefs.timeZone);
    ctx.save(
      task,
      planPatch(task, day),
      t('tasks.toast.scheduled', { when: fmt.relativeDay(day, now) }),
    );
  };

  const leading: SwipeAction[] = [
    {
      id: 'done',
      label: done ? t('tasks.detail.markTodo') : t('tasks.swipe.complete'),
      icon: done ? <IconUndo /> : <IconCheck />,
      tone: 'success',
      removes: !done,
      onAction: () => toggleDone(task, t),
    },
  ];
  const trailing: SwipeAction[] = [
    ...(done
      ? []
      : [
          {
            id: 'plan',
            label: t('tasks.swipe.schedule'),
            icon: <IconCalendar />,
            tone: 'accent' as const,
            onAction: plan,
          },
        ]),
    {
      id: 'delete',
      label: t('tasks.swipe.delete'),
      icon: <IconTrash />,
      tone: 'danger',
      removes: true,
      onAction: () => deleteTask(task, t),
    },
  ];

  return (
    <li className={s.rowItem}>
      <SwipeableRow
        leading={leading}
        trailing={trailing}
        menuLabel={t('tasks.detail.actions', { title: task.title })}
        className={s.swipe}
      >
        <div className={cx(s.row, done && s.rowDone)} data-priority={task.priority}>
          <Checkbox
            shape="circle"
            size="lg"
            checked={done}
            onCheckedChange={() => toggleDone(task, t)}
            aria-label={
              done
                ? t('tasks.detail.reopen', { title: task.title })
                : t('tasks.detail.complete', { title: task.title })
            }
          />
          <button type="button" className={s.rowMain} onClick={() => ctx.openTask(task.id)}>
            <span className={s.rowTitle}>
              {task.icon && (
                <span className={s.rowIcon} aria-hidden="true">
                  {task.icon}
                </span>
              )}
              {task.title}
            </span>
            <TaskMeta task={task} />
          </button>
          <span
            className={s.modeDot}
            data-mode={task.mode}
            title={t(`common.mode.${task.mode}`)}
            aria-hidden="true"
          />
        </div>
      </SwipeableRow>
    </li>
  );
}
