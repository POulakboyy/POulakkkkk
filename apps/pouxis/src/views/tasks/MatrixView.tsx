/** Eisenhower matrix (2.4): computed placement, drag between quadrants with `quadrantPatch`. */
import { useId } from 'react';
import { tasks as engine, type Task } from '@pouxis/core';
import { toast } from '../../ui/index.ts';
import { useTasks } from './context.ts';
import { QUADRANT_KEY } from './labels.ts';
import { isTopLevel } from './model.ts';
import { quadrantReasons, type QuadrantReason } from './rules.ts';
import { DragGhost, TaskCard } from './TaskCard.tsx';
import { gridNavigator, useDragDrop } from './useDragDrop.ts';
import s from './Tasks.module.css';

const ZONES = engine.QUADRANTS.map((q) => `q:${q}`);
const quadrantOf = (zone: string) => zone.slice(2) as engine.Quadrant;

export function MatrixView({ visible }: { visible: readonly Task[] }) {
  const ctx = useTasks();
  const { t, now, byId } = ctx;
  const instructionsId = useId();
  const cells = engine.matrix(
    visible.filter((task) => isTopLevel(task, byId)),
    now,
  );
  const title = (id: string) => byId.get(id)?.title ?? '';
  const qTitle = (zone: string) =>
    t(`tasks.matrix.quadrants.${QUADRANT_KEY[quadrantOf(zone)]}.title`);

  const dnd = useDragDrop({
    zones: ZONES,
    navigate: gridNavigator(2),
    announce: ctx.announce,
    describe: {
      grabbed: (id, zone) => t('tasks.dnd.grabbed', { title: title(id), zone: qTitle(zone) }),
      over: (zone) => t('tasks.dnd.over', { zone: qTitle(zone) }),
      dropped: (id, zone) => t('tasks.dnd.dropped', { title: title(id), zone: qTitle(zone) }),
      cancelled: () => t('tasks.dnd.cancelled'),
    },
    onDrop: (id, zone) => {
      const task = byId.get(id);
      if (!task) return;
      const move = engine.quadrantPatch(task, quadrantOf(zone), now);
      if (!move.ok) {
        toast({ title: t('tasks.dnd.deadlineTooClose'), tone: 'warning' });
        return;
      }
      if (Object.keys(move.patch).length === 0) return;
      ctx.save(task, move.patch, t('tasks.toast.moved', { list: qTitle(zone) }));
    },
  });

  return (
    <div className={s.matrixWrap}>
      <p className={s.viewHint}>{t('tasks.matrix.hint')}</p>
      <p id={instructionsId} hidden>
        {t('tasks.dnd.instructions')}
      </p>
      <div className={s.matrixAxes} aria-hidden="true">
        <span>{t('tasks.matrix.urgent')}</span>
        <span>{t('tasks.matrix.notUrgent')}</span>
      </div>
      <div className={s.matrix}>
        {ZONES.map((zone) => {
          const q = quadrantOf(zone);
          const key = QUADRANT_KEY[q];
          const list = cells[q];
          return (
            <section
              key={zone}
              className={s.quadrant}
              data-quadrant={q}
              aria-label={t(`tasks.matrix.quadrants.${key}.title`)}
              {...dnd.zoneProps(zone)}
            >
              <header className={s.quadrantHeader}>
                <h2 className={s.columnTitle}>
                  {t(`tasks.matrix.quadrants.${key}.title`)}
                  <span className={s.groupCount}>{list.length}</span>
                </h2>
                <p className={s.quadrantHint}>{t(`tasks.matrix.quadrants.${key}.hint`)}</p>
              </header>
              {list.length === 0 ? (
                <p className={s.columnEmpty}>
                  {t(dnd.drag ? 'tasks.kanban.dropHere' : 'tasks.matrix.empty')}
                </p>
              ) : (
                <ul className={s.cards} role="list">
                  {list.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      zone={zone}
                      dnd={dnd}
                      instructionsId={instructionsId}
                      footer={<Reasons reasons={quadrantReasons(task, now)} />}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <DragGhost drag={dnd.drag} task={dnd.drag ? byId.get(dnd.drag.id) : undefined} />
    </div>
  );
}

function Reasons({ reasons }: { reasons: readonly QuadrantReason[] }) {
  const { t, fmt, now } = useTasks();
  if (reasons.length === 0) return null;
  const text = reasons
    .map((r) => {
      switch (r.kind) {
        case 'deadline':
          return t('tasks.matrix.reasons.deadline', { when: fmt.relativeDay(r.at, now) });
        case 'priority':
          return t('tasks.matrix.reasons.priority');
        case 'tag':
          return t('tasks.matrix.reasons.tag', { tag: r.tag });
        case 'manual':
          return t('tasks.matrix.reasons.manual');
      }
    })
    .join(' · ');
  return (
    <p className={s.reasons}>
      <span className={s.reasonsLabel}>{t('tasks.matrix.whyHere')}</span> {text}
    </p>
  );
}
