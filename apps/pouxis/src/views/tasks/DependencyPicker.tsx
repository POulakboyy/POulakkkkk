/**
 * « Ajouter une tâche préalable » (2.1): a native select listing candidate blockers. Options
 * that would close a loop stay visible but disabled, with the reason spelled out.
 */
import { useId, useState } from 'react';
import type { Task } from '@pouxis/core';
import { store } from '../../store/index.ts';
import { Button, IconPlus, toast } from '../../ui/index.ts';
import { useTasks } from './context.ts';
import { addDependency, dependencyOptions } from './rules.ts';
import s from './Tasks.module.css';

export function DependencyPicker({ task, collapsed = false }: { task: Task; collapsed?: boolean }) {
  const { t, all } = useTasks();
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!collapsed);
  const options = dependencyOptions(task, all);
  if (options.length === 0) return null;
  if (!open) {
    return (
      <Button
        size="sm"
        variant="ghost"
        iconStart={<IconPlus />}
        onClick={() => setOpen(true)}
        className={s.pickerToggle}
      >
        {t('tasks.dependencies.add')}
      </Button>
    );
  }

  const pick = (blockerId: string) => {
    const result = addDependency(task, blockerId, all);
    if (!result.ok) {
      const blocker = all.find((x) => x.id === blockerId);
      setError(t('tasks.dependencies.cycle', { title: blocker?.title ?? '' }));
      return;
    }
    setError(null);
    store.update('tasks', task.id, { dependsOn: result.dependsOn });
    toast({ title: t('tasks.dependencies.added') });
  };

  return (
    <div className={s.picker}>
      <label htmlFor={id} className={s.pickerLabel}>
        {t('tasks.dependencies.add')}
      </label>
      <select
        id={id}
        className={s.select}
        autoFocus={collapsed}
        value=""
        onChange={(e) => e.target.value && pick(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="">{t('tasks.dependencies.pickPlaceholder')}</option>
        {options.map(({ task: option, cycle }) => (
          <option key={option.id} value={option.id} disabled={cycle}>
            {cycle ? `${option.title} — ${t('tasks.dependencies.cycleShort')}` : option.title}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className={s.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
