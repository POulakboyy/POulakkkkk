/**
 * Subtasks of a task, with « Décomposer » (2.2): the offline heuristic proposes steps, the user
 * keeps what helps. Nothing is saved until « Tout garder » / « Garder la sélection ».
 */
import { useState, type FormEvent } from 'react';
import { tasks as engine, type Task } from '@pouxis/core';
import { store } from '../../store/index.ts';
import {
  Button,
  Checkbox,
  IconClose,
  IconPlus,
  IconSparkle,
  IconButton,
  TextField,
  toast,
} from '../../ui/index.ts';
import { deleteTask, toggleDone } from './actions.ts';
import { useTasks } from './context.ts';
import s from './Tasks.module.css';

/** Saves the chosen drafts as subtasks of `parent`, in one undoable batch. */
export function keepDrafts(parent: Task, drafts: readonly engine.SubtaskDraft[]): number {
  const records = engine.subtaskRecords(drafts, { parent });
  store.batch(() => {
    for (const record of records) store.create('tasks', record);
  });
  return records.length;
}

export function SubtasksSection({ task }: { task: Task }) {
  const { t, fmt, all, prefs } = useTasks();
  const children = all.filter((x) => x.parentId === task.id && x.status !== 'archived');
  const progress = engine.subtaskProgress(task.id, all);
  const [draft, setDraft] = useState('');
  const [proposal, setProposal] = useState<engine.SubtaskDraft[] | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    keepDrafts(task, [{ title, mode: task.mode, dependsOn: [] }]);
    setDraft('');
  };

  const decompose = async () => {
    setBusy(true);
    try {
      const drafts = await engine.heuristicDecomposer.decompose(task.title, {
        locale: prefs.locale,
        parent: task,
        ...(task.estimateMin !== undefined && { budgetMin: task.estimateMin }),
      });
      setProposal(drafts);
      setPicked(new Set(drafts.map((_, i) => i)));
    } catch {
      toast({ title: t('tasks.subtasks.splitFailed'), tone: 'warning' });
    } finally {
      setBusy(false);
    }
  };

  const keep = (indices: ReadonlySet<number>) => {
    if (!proposal) return;
    // Keep the chosen drafts; dependencies on dropped drafts are re-indexed or dropped.
    const kept = [...indices].sort((a, b) => a - b);
    const drafts = kept.map((i) => {
      const d = proposal[i]!;
      const dependsOn = d.dependsOn.flatMap((ref) => {
        const j = kept.indexOf(ref);
        return j >= 0 ? [j] : [];
      });
      return { ...d, dependsOn };
    });
    const count = keepDrafts(task, drafts);
    setProposal(null);
    toast({ title: t('tasks.subtasks.added', { count }) });
  };

  const toggle = (i: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section className={s.section} aria-labelledby={`sub-${task.id}`}>
      <header className={s.sectionHeader}>
        <h3 id={`sub-${task.id}`} className={s.sectionTitle}>
          {t('tasks.subtasks.title')}
          {progress.total > 0 && (
            <span className={s.groupCount} aria-label={t('tasks.subtasks.progressA11y', progress)}>
              {t('tasks.subtasks.progress', progress)}
            </span>
          )}
        </h3>
        <Button
          size="sm"
          variant="secondary"
          iconStart={<IconSparkle />}
          loading={busy}
          onClick={() => void decompose()}
        >
          {t('tasks.subtasks.decompose')}
        </Button>
      </header>

      {proposal && (
        <div
          className={s.proposal}
          role="group"
          aria-label={t('tasks.subtasks.proposed', { count: proposal.length })}
        >
          <p className={s.proposalTitle}>
            {t('tasks.subtasks.proposed', { count: proposal.length })}
            <span className={s.muted}> — {t('tasks.subtasks.review')}</span>
          </p>
          <ul className={s.proposalList}>
            {proposal.map((d, i) => (
              <li key={i}>
                <Checkbox
                  checked={picked.has(i)}
                  onCheckedChange={() => toggle(i)}
                  label={d.title}
                  {...(d.estimateMin !== undefined && {
                    description: fmt.duration(d.estimateMin),
                  })}
                />
              </li>
            ))}
          </ul>
          <div className={s.actions}>
            <Button size="sm" onClick={() => keep(new Set(proposal.map((_, i) => i)))}>
              {t('tasks.subtasks.keepAll')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={picked.size === 0}
              onClick={() => keep(picked)}
            >
              {t('tasks.subtasks.keepSelected')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setProposal(null)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {children.length === 0 && !proposal ? (
        <p className={s.muted}>{t('tasks.subtasks.empty')}</p>
      ) : (
        <ul className={s.subtasks}>
          {children.map((child) => (
            <li key={child.id} className={s.subtask}>
              <Checkbox
                shape="circle"
                checked={child.status === 'done'}
                onCheckedChange={() => toggleDone(child, t)}
                label={child.title}
              />
              {child.estimateMin !== undefined && (
                <span className={s.muted}>{fmt.duration(child.estimateMin, 'compact')}</span>
              )}
              <IconButton
                size="sm"
                variant="ghost"
                icon={<IconClose />}
                label={t('tasks.subtasks.remove', { title: child.title })}
                onClick={() => deleteTask(child, t)}
              />
            </li>
          ))}
        </ul>
      )}

      <form className={s.inlineForm} onSubmit={add}>
        <TextField
          label={t('tasks.subtasks.add')}
          hideLabel
          placeholder={t('tasks.subtasks.placeholder')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          iconStart={<IconPlus />}
        />
      </form>
    </section>
  );
}
