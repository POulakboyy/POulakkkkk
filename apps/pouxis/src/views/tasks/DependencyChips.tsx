/** The tasks `task` waits on, as removable chips (done ones keep a check mark). */
import { tasks as engine, type Task } from '@pouxis/core';
import { store } from '../../store/index.ts';
import { Chip, toast } from '../../ui/index.ts';
import { useTasks } from './context.ts';
import s from './Tasks.module.css';

export function DependencyChips({ task }: { task: Task }) {
  const { t, byId } = useTasks();
  const blockers = task.dependsOn.flatMap((id) => byId.get(id) ?? []);
  if (blockers.length === 0) return null;

  const remove = (blocker: Task) => {
    store.update('tasks', task.id, { dependsOn: task.dependsOn.filter((id) => id !== blocker.id) });
    toast({ title: t('tasks.dependencies.removed') });
  };

  return (
    <ul className={s.chips} aria-label={t('tasks.fields.dependsOn')}>
      {blockers.map((blocker) => (
        <li key={blocker.id}>
          <Chip
            onRemove={() => remove(blocker)}
            removeLabel={t('tasks.dependencies.removeA11y', { title: blocker.title })}
          >
            {engine.isOpen(blocker) ? '' : '✓ '}
            {blocker.title}
          </Chip>
        </li>
      ))}
    </ul>
  );
}
