import { useMemo } from 'react';
import { graph as g } from '@pouxis/core';
import { navigate, useRoute } from '../../app/router.ts';
import { useT } from '../../i18n/index.ts';
import { store, useCollection } from '../../store/index.ts';
import { Button, EmptyState, IconCanvas, IconTasks } from '../../ui/index.ts';
import { starterContent } from './actions.ts';
import { CanvasWorkspace } from './Workspace.tsx';
import { latestGraph } from './model.ts';
import s from './Canvas.module.css';

/**
 * Canvas view (module 4). Opens the canvas named by `#/canvas?graph=<id>`, else the most
 * recently edited one; without any canvas, offers to start one.
 */
export default function CanvasView() {
  const t = useT();
  const route = useRoute();
  const graphs = useCollection('graphs');
  const requested = route.params.get('graph');
  const graph = useMemo(
    () => graphs.find((x) => x.id === requested) ?? latestGraph(graphs),
    [graphs, requested],
  );

  if (!graph) {
    const start = (fromTasks: boolean) => {
      const content = fromTasks
        ? g.tasksToGraph(
            store.all('tasks').filter((task) => task.status !== 'archived'),
            { layout: { orientation: 'horizontal' } },
          )
        : starterContent(t);
      const created = store.create('graphs', { title: t('canvas.untitled'), ...content });
      navigate('canvas', { graph: created.id });
    };
    return (
      <div className={s.emptyPage}>
        <EmptyState
          size="page"
          icon={<IconCanvas size={32} />}
          title={t('canvas.empty.title')}
          description={t('canvas.empty.body')}
          action={<Button onClick={() => start(false)}>{t('canvas.empty.action')}</Button>}
          secondaryAction={
            <Button variant="ghost" iconStart={<IconTasks size={18} />} onClick={() => start(true)}>
              {t('canvas.empty.tasks')}
            </Button>
          }
        />
      </div>
    );
  }
  return <CanvasWorkspace key={graph.id} graph={graph} graphs={graphs} />;
}
