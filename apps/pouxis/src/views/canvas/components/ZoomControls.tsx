import { useSyncExternalStore } from 'react';
import type { graph } from '@pouxis/core';
import { useFormat, useT } from '../../../i18n/index.ts';
import { IconMinus, IconPlus, Tooltip } from '../../../ui/index.ts';
import type { CanvasController } from '../engine/controller.ts';
import type { Signal } from '../engine/signal.ts';
import { IconFit } from './icons.tsx';
import s from '../Canvas.module.css';

export function ZoomControls(props: {
  controller: CanvasController | null;
  viewport: Signal<graph.Viewport>;
  duration: number;
}) {
  const t = useT();
  const f = useFormat();
  const zoom = useSyncExternalStore(props.viewport.subscribe, () => props.viewport.get().zoom);
  const c = props.controller;
  const percent = f.percent(zoom, 0);
  return (
    <div className={s.zoom} role="group" aria-label={t('canvas.view.zoomLevel', { percent })}>
      <Tooltip content={t('canvas.view.zoomOut')} shortcut="−">
        <button
          type="button"
          className={s.barIcon}
          aria-label={t('canvas.view.zoomOut')}
          onClick={() => c?.zoomBy(1 / 1.25, undefined, props.duration)}
        >
          <IconMinus size={18} />
        </button>
      </Tooltip>
      <button
        type="button"
        className={s.zoomValue}
        aria-label={t('canvas.view.fit')}
        onClick={() => c?.fit(props.duration * 1.5)}
      >
        {percent}
      </button>
      <Tooltip content={t('canvas.view.zoomIn')} shortcut="+">
        <button
          type="button"
          className={s.barIcon}
          aria-label={t('canvas.view.zoomIn')}
          onClick={() => c?.zoomBy(1.25, undefined, props.duration)}
        >
          <IconPlus size={18} />
        </button>
      </Tooltip>
      <Tooltip content={t('canvas.view.fit')} shortcut="0">
        <button
          type="button"
          className={s.barIcon}
          aria-label={t('canvas.view.fit')}
          onClick={() => c?.fit(props.duration * 1.5)}
        >
          <IconFit size={18} />
        </button>
      </Tooltip>
    </div>
  );
}
