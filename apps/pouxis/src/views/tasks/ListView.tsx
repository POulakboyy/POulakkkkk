/** Smart list (Spark-like): tasks sorted into decision groups, completed ones folded away. */
import { useId, useState } from 'react';
import type { Task } from '@pouxis/core';
import { Button, IconChevronDown, IconChevronUp } from '../../ui/index.ts';
import { useTasks } from './context.ts';
import { GROUP_LABEL } from './labels.ts';
import { groupTasks, type ListGroup } from './model.ts';
import { TaskRow } from './TaskRow.tsx';
import s from './Tasks.module.css';

export function ListView({ visible }: { visible: readonly Task[] }) {
  const { all, now, prefs } = useTasks();
  const groups = groupTasks(all, visible, now, prefs.timeZone);
  return (
    <div className={s.groups}>
      {groups.map((group) => (
        <GroupSection key={group.id} group={group} />
      ))}
    </div>
  );
}

function GroupSection({ group }: { group: ListGroup }) {
  const { t } = useTasks();
  const headingId = useId();
  const foldable = group.id === 'done';
  const [open, setOpen] = useState(!foldable);
  const count = group.tasks.length;

  return (
    <section className={s.group} aria-labelledby={headingId} data-group={group.id}>
      <header className={s.groupHeader}>
        <h2 id={headingId} className={s.groupTitle}>
          {t(GROUP_LABEL[group.id])}
          <span className={s.groupCount}>{count}</span>
        </h2>
        {foldable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            iconEnd={open ? <IconChevronUp /> : <IconChevronDown />}
          >
            {t(open ? 'tasks.groups.hideDone' : 'tasks.groups.showDone')}
          </Button>
        )}
      </header>
      {group.id === 'toReschedule' && (
        <p className={s.groupHint}>{t('tasks.groups.toRescheduleHint')}</p>
      )}
      {open && (
        <ul className={s.rows} role="list">
          {group.tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  );
}
