/** Dependencies view (2.1): linked tasks in dependency order, blocked or ready at a glance. */
import { tasks as engine, type Task } from '@pouxis/core';
import { Badge, EmptyState, IconLayers, IconLock } from '../../ui/index.ts';
import { DependencyChips } from './DependencyChips.tsx';
import { useTasks } from './context.ts';
import { DependencyPicker } from './DependencyPicker.tsx';
import { linkedTasks } from './rules.ts';
import s from './Tasks.module.css';

export function DepsView({ visible }: { visible: readonly Task[] }) {
  const { t, all } = useTasks();
  const shown = new Set(visible.map((task) => task.id));
  const linked = linkedTasks(all).filter((task) => shown.has(task.id));

  if (linked.length === 0) {
    return (
      <EmptyState
        icon={<IconLayers />}
        title={t('tasks.dependencies.emptyTitle')}
        description={t('tasks.dependencies.emptyBody')}
      />
    );
  }
  return (
    <div className={s.depsWrap}>
      <p className={s.viewHint}>{t('tasks.dependencies.hint')}</p>
      <ol className={s.deps}>
        {linked.map((task) => (
          <DependencyItem key={task.id} task={task} />
        ))}
      </ol>
    </div>
  );
}

export function DependencyItem({ task }: { task: Task }) {
  const { t, all, byId, openTask } = useTasks();
  const open = engine.isOpen(task);
  const blocked = open && !engine.isActionable(task, byId);
  const unlocks = all.filter((x) => x.dependsOn.includes(task.id) && engine.isOpen(x)).length;

  return (
    <li className={s.dep} data-blocked={blocked || undefined}>
      <div className={s.depHead}>
        <span className={s.depRail} aria-hidden="true">
          {blocked ? <IconLock /> : <span className={s.depDot} />}
        </span>
        <button type="button" className={s.depTitle} onClick={() => openTask(task.id)}>
          {task.title}
        </button>
        {open ? (
          <Badge tone={blocked ? 'warning' : 'success'}>
            {t(blocked ? 'tasks.dependencies.blocked' : 'tasks.dependencies.ready')}
          </Badge>
        ) : (
          <Badge tone="neutral">{t('common.status.done')}</Badge>
        )}
      </div>
      <div className={s.depBody}>
        <DependencyChips task={task} />
        {unlocks > 0 && (
          <p className={s.depUnlocks}>{t('tasks.dependencies.unlocks', { count: unlocks })}</p>
        )}
        {open && <DependencyPicker task={task} collapsed />}
      </div>
    </li>
  );
}
