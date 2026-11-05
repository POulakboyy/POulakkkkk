/**
 * Tasks view: capture line, Airbnb-style filter pills and four lenses on the same tasks —
 * smart list, kanban, Eisenhower matrix and dependencies — plus the detail sheet and the WIP
 * limit dialog. Route: `#/tasks?view=kanban&task=<id>`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tasks as engine, startOfDay, type Task } from '@pouxis/core';
import { navigate, useRoute } from '../../app/router.ts';
import { useFormat, useT } from '../../i18n/index.ts';
import {
  store,
  useCollection,
  usePrefs,
  type NewRecord,
  type RecordPatch,
} from '../../store/index.ts';
import {
  Button,
  EmptyState,
  IconClock,
  IconFilter,
  IconFlag,
  IconHash,
  IconSearch,
  IconTasks,
  Pill,
  PillGroup,
  SegmentedControl,
  TextField,
  VisuallyHidden,
  formatKey,
  toast,
  useHotkeys,
  useMediaQuery,
  DESKTOP_QUERY,
} from '../../ui/index.ts';
import { patchTask } from './actions.ts';
import { BoardView } from './BoardView.tsx';
import { TasksContext, type TasksContextValue } from './context.ts';
import { DepsView } from './DepsView.tsx';
import { PILL_LABEL, VIEW_LABEL } from './labels.ts';
import { ListView } from './ListView.tsx';
import { MatrixView } from './MatrixView.tsx';
import {
  EMPTY_FILTERS,
  FILTER_PILLS,
  VIEW_MODES,
  isFiltering,
  matchesFilters,
  parseViewMode,
  topTags,
  type FilterPill,
  type TaskFilters,
  type TaskViewMode,
} from './model.ts';
import { QuickAdd } from './QuickAdd.tsx';
import { resolveWip, wipConflict, type WipConflict, type WipResolution } from './rules.ts';
import { TaskSheet } from './TaskSheet.tsx';
import { WipDialog } from './WipDialog.tsx';
import s from './Tasks.module.css';

/** Re-renders once a minute so « aujourd’hui » and urgency stay true. */
function useMinute(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Task keys whose change can exceed the daily priority limit (2.15). */
const WIP_KEYS = ['priority', 'status', 'floatingDay', 'scheduled'] as const;

interface PendingWip {
  conflict: WipConflict;
  apply: (override: Partial<Task>) => void;
}

export default function TasksView() {
  const t = useT();
  const fmt = useFormat();
  const prefs = usePrefs();
  const now = useMinute();
  const all = useCollection('tasks');
  const route = useRoute();
  const wide = useMediaQuery(DESKTOP_QUERY);
  const mode = parseViewMode(route.params.get('view'));
  const openId = route.params.get('task') ?? undefined;
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [pending, setPending] = useState<PendingWip | null>(null);
  const [message, setMessage] = useState('');
  const quickRef = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => engine.indexById(all), [all]);
  const live = useMemo(() => all.filter((task) => task.status !== 'archived'), [all]);
  const todayStart = startOfDay(now, prefs.timeZone);
  const visible = useMemo(
    () =>
      live.filter((task) =>
        matchesFilters(task, filters, { byId, todayStart, timeZone: prefs.timeZone }),
      ),
    [live, filters, byId, todayStart, prefs.timeZone],
  );

  const setParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = Object.fromEntries(route.params);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete params[k];
        else params[k] = v;
      }
      navigate('tasks', params);
    },
    [route.params],
  );

  /** Runs `apply` now, or after the WIP dialog when it would exceed the daily limit. */
  const guard = useCallback(
    (candidate: Parameters<typeof wipConflict>[1], apply: (o: Partial<Task>) => void) => {
      const conflict = wipConflict(store.all('tasks'), candidate, prefs);
      if (conflict) setPending({ conflict, apply });
      else apply({});
    },
    [prefs],
  );

  const save = useCallback<TasksContextValue['save']>(
    (task, patch, title) => {
      const apply = (override: Partial<Task>) => {
        const full = { ...patch, ...override } as RecordPatch<'tasks'>;
        if (title) patchTask(task, full, t, title);
        else store.update('tasks', task.id, full);
      };
      // Only a change of priority, status or planned day can push a day over the limit; a day
      // already over it (limit lowered, synced edits) must not block unrelated edits.
      if (WIP_KEYS.some((k) => k in patch)) guard({ ...task, ...patch } as Task, apply);
      else apply({});
    },
    [guard, t],
  );

  const create = (record: NewRecord<'tasks'>) =>
    guard(record as Task, (override) => {
      const created = store.create('tasks', { ...record, ...override } as NewRecord<'tasks'>);
      toast({
        title: t('tasks.add.added'),
        description: created.title,
        action: { label: t('common.undo'), onClick: () => store.remove('tasks', created.id) },
      });
    });

  const resolve = (choice: WipResolution) => {
    const p = pending;
    setPending(null);
    if (!p) return;
    const r = resolveWip(choice, p.conflict, prefs.timeZone);
    if (!r) return;
    if (r.demote) {
      store.update('tasks', r.demote.id, { priority: 2 });
      toast({ title: t('tasks.wip.swapped', { title: r.demote.title }) });
    }
    p.apply(r.override);
  };

  const announce = useCallback((m: string) => setMessage(m), []);
  const ctx = useMemo<TasksContextValue>(
    () => ({
      t,
      fmt,
      prefs,
      now,
      all,
      byId,
      save,
      announce,
      openTask: (id) => setParams({ task: id }),
    }),
    [t, fmt, prefs, now, all, byId, save, announce, setParams],
  );

  useHotkeys({ n: () => quickRef.current?.focus() });

  const wip = engine.wipStatus(live, now, prefs, prefs.timeZone);
  const openCount = live.filter(engine.isOpen).length;
  const filtering = isFiltering(filters);

  return (
    <TasksContext.Provider value={ctx}>
      <div className={s.page}>
        <header className={s.header}>
          <div>
            <p className={s.eyebrow}>{fmt.date(now, 'weekdayDayMonth')}</p>
            <h1 className={s.title}>{t('tasks.title')}</h1>
            <p className={s.subtitle}>{t('tasks.summary', { count: openCount })}</p>
          </div>
          {wip.enabled && (
            <span
              className={s.wipBadge}
              data-at-limit={wip.atLimit || undefined}
              aria-label={t('tasks.wip.counterA11y', { count: wip.count, limit: wip.limit })}
            >
              <IconFlag aria-hidden="true" />
              {t('tasks.wip.counter', { count: wip.count, limit: wip.limit })}
            </span>
          )}
        </header>

        <QuickAdd onCreate={create} inputRef={quickRef} />

        <div className={s.toolbar}>
          <SegmentedControl
            label={t('tasks.views.label')}
            size={wide ? 'md' : 'sm'}
            fullWidth={!wide}
            value={mode}
            onChange={(v: TaskViewMode) => setParams({ view: v === 'list' ? undefined : v })}
            options={VIEW_MODES.map((m) => ({
              value: m,
              label: t(!wide && m === 'deps' ? 'tasks.views.depsShort' : VIEW_LABEL[m]),
            }))}
            className={s.views}
          />
          <TextField
            label={t('tasks.search.label')}
            hideLabel
            type="search"
            value={filters.query}
            placeholder={t('tasks.search.placeholder')}
            iconStart={<IconSearch />}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            wrapperClassName={s.search}
          />
        </div>

        <FilterPills tasks={live} filters={filters} onChange={setFilters} />

        <div className={s.body}>
          {live.length === 0 ? (
            <EmptyState
              size="page"
              icon={<IconTasks />}
              title={t('tasks.empty.list.title')}
              description={t('tasks.empty.list.body', { shortcut: `${formatKey('mod')} K` })}
              action={
                <Button onClick={() => quickRef.current?.focus()}>
                  {t('tasks.empty.list.action')}
                </Button>
              }
            />
          ) : visible.length === 0 && filtering ? (
            <EmptyState
              icon={<IconFilter />}
              title={t('tasks.empty.filtered.title')}
              description={t('tasks.empty.filtered.body')}
              action={
                <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                  {t('tasks.empty.filtered.action')}
                </Button>
              }
            />
          ) : mode === 'kanban' ? (
            <BoardView visible={visible} />
          ) : mode === 'matrix' ? (
            <MatrixView visible={visible} />
          ) : mode === 'deps' ? (
            <DepsView visible={visible} />
          ) : (
            <ListView visible={visible} />
          )}
        </div>

        <VisuallyHidden>
          <div role="status" aria-live="polite">
            {message}
          </div>
        </VisuallyHidden>
      </div>

      <TaskSheet id={openId} onClose={() => setParams({ task: undefined })} />
      <WipDialog conflict={pending?.conflict ?? null} onResolve={resolve} />
    </TasksContext.Provider>
  );
}

function FilterPills({
  tasks,
  filters,
  onChange,
}: {
  tasks: readonly Task[];
  filters: TaskFilters;
  onChange: (f: TaskFilters) => void;
}) {
  const t = useT();
  const tags = topTags(tasks);
  const togglePill = (pill: FilterPill, on: boolean) =>
    onChange({
      ...filters,
      pills: on ? [...filters.pills, pill] : filters.pills.filter((p) => p !== pill),
    });
  const toggleTag = (tag: string, on: boolean) =>
    onChange({
      ...filters,
      tags: on ? [...filters.tags, tag] : filters.tags.filter((x) => x !== tag),
    });

  return (
    <div className={s.pillsRow}>
      <PillGroup label={t('tasks.filters.label')} className={s.pills}>
        {FILTER_PILLS.map((pill) => (
          <Pill
            key={pill}
            size="sm"
            selected={filters.pills.includes(pill)}
            onSelectedChange={(on) => togglePill(pill, on)}
            icon={pill === 'priority' ? <IconFlag /> : pill === 'quick' ? <IconClock /> : undefined}
          >
            {t(PILL_LABEL[pill])}
          </Pill>
        ))}
        {tags.map((tag) => (
          <Pill
            key={`tag-${tag}`}
            size="sm"
            icon={<IconHash />}
            selected={filters.tags.includes(tag)}
            onSelectedChange={(on) => toggleTag(tag, on)}
          >
            {tag}
          </Pill>
        ))}
      </PillGroup>
      {isFiltering(filters) && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
          {t('tasks.filters.clear')}
        </Button>
      )}
    </div>
  );
}
