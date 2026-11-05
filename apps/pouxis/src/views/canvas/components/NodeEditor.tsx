import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Id, graph } from '@pouxis/core';
import type { CanvasController } from '../engine/controller.ts';
import { NODE_MAX_WIDTH, NODE_MIN_WIDTH } from '../engine/scene.ts';
import type { Scene } from '../engine/scene.ts';
import type { Signal } from '../engine/signal.ts';
import s from '../Canvas.module.css';

/** What to do after committing: Tab chains a child (mind-map typing flow). */
export type EditNext = 'child' | undefined;

export interface NodeEditorProps {
  controller: CanvasController;
  /** Passed explicitly: this layout effect runs before the controller receives a new scene. */
  scene: Scene;
  viewport: Signal<graph.Viewport>;
  nodeId: Id;
  initial: string;
  label: string;
  placeholder: string;
  onCommit: (label: string, next: EditNext) => void;
  onCancel: () => void;
}

/** Text field laid exactly over a node while its label is edited. */
export function NodeEditor(props: NodeEditorProps) {
  const { controller, scene, viewport, nodeId } = props;
  const [value, setValue] = useState(props.initial);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const settled = useRef(false);

  useLayoutEffect(() => {
    const place = () => {
      const el = box.current;
      const node = scene.byId.get(nodeId);
      if (!el || !node) return;
      const vp = controller.getViewport();
      const p = controller.worldToScreen({ x: node.x, y: node.y });
      const zoom = Math.max(0.6, Math.min(vp.zoom, 2));
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${zoom})`;
      el.style.minWidth = `${Math.max(NODE_MIN_WIDTH, node.w)}px`;
      el.dataset.placed = 'true';
    };
    place();
    return viewport.subscribe(place);
  }, [controller, scene, viewport, nodeId]);

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
    input.current?.select();
  }, []);

  const commit = (next: EditNext) => {
    if (settled.current) return;
    settled.current = true;
    props.onCommit(value, next);
  };

  return (
    <div ref={box} className={s.editor} style={{ maxWidth: NODE_MAX_WIDTH * 1.5 }}>
      <input
        ref={input}
        className={s.editorInput}
        value={value}
        aria-label={props.label}
        placeholder={props.placeholder}
        maxLength={500}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => commit(undefined)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(undefined);
          } else if (e.key === 'Tab') {
            e.preventDefault();
            commit('child');
          } else if (e.key === 'Escape') {
            e.preventDefault();
            settled.current = true;
            props.onCancel();
          }
        }}
        size={Math.max(8, value.length + 1)}
      />
    </div>
  );
}
