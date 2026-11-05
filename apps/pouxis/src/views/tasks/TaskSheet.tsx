/**
 * Task detail sheet: every property of one task, edited in place and saved as you go
 * (local-first, no « Enregistrer » button). Side panel on desktop, bottom sheet on phones.
 */
import { useState, type ReactNode } from 'react';
import {
  tasks as engine,
  type Energy,
  type Priority,
  type Task,
  type TaskStatus,
} from '@pouxis/core';
import { store, useRecord } from '../../store/index.ts';
import { Button, Checkbox, IconTrash, SegmentedControl, Sheet, TextField } from '../../ui/index.ts';
import { completeTask, deleteTask, planPatch, reopenTask } from './actions.ts';
import { useTasks } from './context.ts';
import { DependencyPicker } from './DependencyPicker.tsx';
import { DependencyChips } from './DependencyChips.tsx';
import { FieldsSection } from './FieldsSection.tsx';
import { MODE_LABEL, PRIORITY_LABEL, STATUS_LABEL } from './labels.ts';
import { plannedAt } from './model.ts';
import { deadlineFromDateInput, fromDateInput, toDateInput } from './rules.ts';
import {
  GeoSection,
  NotesField,
  PomodoroSection,
  RecurrenceField,
  TagsField,
} from './SheetParts.tsx';
import { SubtasksSection } from './SubtasksSection.tsx';
import s from './Tasks.module.css';

const STATUSES: readonly TaskStatus[] = ['inbox', 'todo', 'doing', 'done'];
const PRIORITIES: readonly Priority[] = [0, 1, 2, 3];
const ENERGIES = ['none', 'low', 'medium', 'high'] as const;

export function TaskSheet({ id, onClose }: { id: string | undefined; onClose: () => void }) {
  const task = useRecord('tasks', id);
  const { t } = useTasks();
  return (
    <Sheet
      open={task !== undefined}
      onOpenChange={(open) => !open && onClose()}
      title={task?.title ?? t('tasks.detail.a11y')}
      hideTitle
      footer={
        task && (
          <div className={s.sheetFooter}>
            <Button
              variant="danger-soft"
              iconStart={<IconTrash />}
              onClick={() => {
                onClose();
                deleteTask(task, t);
              }}
            >
              {t('tasks.detail.delete')}
            </Button>
          </div>
        )
      }
    >
      {/* Keyed so drafts reset when another task opens in the same sheet. */}
      {task && <TaskDetail key={task.id} task={task} />}
    </Sheet>
  );
}

function TaskDetail({ task }: { task: Task }) {
  const ctx = useTasks();
  const { t, prefs, all } = ctx;
  const [title, setTitle] = useState(task.title);
  const done = task.status === 'done';
  const tz = prefs.timeZone;
  const parent = task.parentId ? ctx.byId.get(task.parentId) : undefined;

  const commitTitle = () => {
    const trimmed = title.trim();
    if (!trimmed) return setTitle(task.title);
    if (trimmed !== task.title) store.update('tasks', task.id, { title: trimmed });
  };
  const setStatus = (status: TaskStatus) => {
    if (status === task.status) return;
    if (status === 'done') return completeTask(task, t);
    if (task.status === 'done') return reopenTask(task, t);
    store.update('tasks', task.id, { status });
  };
  const setPlanned = (value: string) => {
    const day = fromDateInput(value, tz);
    if (day === undefined) {
      store.update('tasks', task.id, { floatingDay: undefined, scheduled: undefined });
    } else {
      ctx.save(task, planPatch(task, day));
    }
  };
  const estimate = task.estimateMin;

  return (
    <div className={s.detail}>
      {parent && (
        <button type="button" className={s.parentLink} onClick={() => ctx.openTask(parent.id)}>
          ↑ {parent.title}
        </button>
      )}
      <div className={s.detailHead}>
        <Checkbox
          shape="circle"
          size="lg"
          checked={done}
          onCheckedChange={(on) => setStatus(on ? 'done' : 'todo')}
          aria-label={t(done ? 'tasks.detail.markTodo' : 'tasks.detail.markDone')}
        />
        <TextField
          label={t('tasks.fields.title')}
          hideLabel
          size="lg"
          value={title}
          placeholder={t('tasks.fields.titlePlaceholder')}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className={s.titleInput}
          wrapperClassName={s.grow}
        />
      </div>

      <Group label={t('tasks.detail.status')}>
        <SegmentedControl
          size="sm"
          fullWidth
          label={t('tasks.detail.status')}
          value={task.status === 'archived' ? 'done' : task.status}
          onChange={setStatus}
          options={STATUSES.map((v) => ({ value: v, label: t(STATUS_LABEL[v]) }))}
        />
      </Group>

      <Group label={t('tasks.fields.priority')}>
        <SegmentedControl
          size="sm"
          fullWidth
          label={t('tasks.fields.priority')}
          value={String(task.priority)}
          onChange={(v) => ctx.save(task, { priority: Number(v) as Priority })}
          options={PRIORITIES.map((p) => ({ value: String(p), label: t(PRIORITY_LABEL[p]) }))}
        />
      </Group>

      <Group label={t('tasks.fields.mode')}>
        <SegmentedControl
          size="sm"
          fullWidth
          label={t('tasks.fields.mode')}
          value={task.mode}
          onChange={(mode) => store.update('tasks', task.id, { mode })}
          options={(['create', 'organize'] as const).map((m) => ({
            value: m,
            label: t(MODE_LABEL[m]),
          }))}
        />
      </Group>
      <Group label={t('tasks.fields.energy')}>
        <SegmentedControl
          size="sm"
          fullWidth
          label={t('tasks.fields.energy')}
          value={task.energy ?? 'none'}
          onChange={(v) =>
            store.update('tasks', task.id, { energy: v === 'none' ? undefined : (v as Energy) })
          }
          options={ENERGIES.map((e) => ({
            value: e,
            label: e === 'none' ? '—' : t(`common.energy.${e}`),
          }))}
        />
      </Group>

      <div className={s.grid2}>
        <TextField
          label={t('tasks.fields.estimate')}
          type="number"
          min={0}
          step={5}
          inputMode="numeric"
          defaultValue={estimate ?? ''}
          trailing={<span className={s.muted}>{t('tasks.detail.minutes')}</span>}
          onBlur={(e) => {
            const n = Math.round(Number(e.target.value));
            const next = e.target.value.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
            if (next !== estimate) store.update('tasks', task.id, { estimateMin: next });
          }}
        />
        <TextField
          label={t('tasks.fields.floatingDay')}
          type="date"
          value={toDateInput(plannedAt(task), tz)}
          onChange={(e) => setPlanned(e.target.value)}
        />
        <TextField
          label={t('tasks.fields.deadline')}
          type="date"
          value={toDateInput(task.deadline, tz)}
          onChange={(e) =>
            store.update('tasks', task.id, { deadline: deadlineFromDateInput(e.target.value, tz) })
          }
        />
      </div>

      <RecurrenceField task={task} />
      <TagsField task={task} />
      <NotesField task={task} />
      <SubtasksSection task={task} />

      <section className={s.section} aria-labelledby={`deps-${task.id}`}>
        <header className={s.sectionHeader}>
          <h3 id={`deps-${task.id}`} className={s.sectionTitle}>
            {t('tasks.dependencies.title')}
          </h3>
        </header>
        {task.dependsOn.length === 0 && <p className={s.muted}>{t('tasks.dependencies.none')}</p>}
        <DependencyChips task={task} />
        {engine.isOpen(task) && <DependencyPicker task={task} />}
        {all.some((x) => x.dependsOn.includes(task.id) && engine.isOpen(x)) && (
          <p className={s.muted}>
            {t('tasks.dependencies.unlocks', {
              count: all.filter((x) => x.dependsOn.includes(task.id) && engine.isOpen(x)).length,
            })}
          </p>
        )}
      </section>

      <FieldsSection task={task} />
      <PomodoroSection task={task} />
      <GeoSection task={task} />
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.group2}>
      <span className={s.fieldLabel} aria-hidden="true">
        {label}
      </span>
      {children}
    </div>
  );
}
