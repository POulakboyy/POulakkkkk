/**
 * Completing a task from Today or from the focus player: saves the status, then announces
 * the tasks it unlocks (2.1) with a toast that can put the next one on today's list.
 */
import { startOfDay, tasks as taskEngine } from '@pouxis/core';
import type { Id, Task, Timestamp } from '@pouxis/core';
import { navigate } from '../../app/router.ts';
import { translate } from '../../i18n/index.ts';
import type { Store } from '../../store/index.ts';
import { toast } from '../../ui/index.ts';

/** Marks the task done and returns the tasks that became actionable because of it. */
export function completeTask(store: Store, taskId: Id, now: Timestamp): Task[] {
  const task = store.get('tasks', taskId);
  if (!task || task.status === 'done') return [];
  const unlocked = taskEngine.unlockedBy(taskId, store.all('tasks'));
  store.update('tasks', taskId, { status: 'done', completedAt: now });
  announceUnlocked(store, task, unlocked, now);
  return unlocked;
}

/** Puts a completed task back to "to do". */
export function reopenTask(store: Store, taskId: Id): void {
  store.update('tasks', taskId, { status: 'todo', completedAt: undefined });
}

function announceUnlocked(store: Store, blocker: Task, unlocked: Task[], now: Timestamp): void {
  const first = unlocked[0];
  if (!first) return;
  const { locale, timeZone } = store.prefs();
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
  const today = startOfDay(now, timeZone);

  if (unlocked.length > 1) {
    toast({
      title: t('today.unlocked.many', { count: unlocked.length }),
      description: t('today.unlocked.body', { blocker: blocker.title }),
      tone: 'success',
      action: { label: t('today.unlocked.view'), onClick: () => navigate('tasks') },
    });
    return;
  }

  const plannedToday =
    (first.floatingDay !== undefined && startOfDay(first.floatingDay, timeZone) === today) ||
    (first.scheduled !== undefined && startOfDay(first.scheduled.start, timeZone) === today);
  toast({
    title: t('today.unlocked.title', { title: first.title }),
    description: t('today.unlocked.body', { blocker: blocker.title }),
    tone: 'success',
    action: plannedToday
      ? { label: t('today.unlocked.view'), onClick: () => navigate('tasks') }
      : {
          label: t('today.unlocked.addToToday'),
          onClick: () => store.update('tasks', first.id, { floatingDay: today }),
        },
  });
}
