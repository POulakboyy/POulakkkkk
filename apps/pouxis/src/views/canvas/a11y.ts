import type { MessageKey, MessageVars } from '../../i18n/index.ts';
import type { SceneNode } from './engine/scene.ts';

type T = (key: MessageKey, vars?: MessageVars) => string;

/**
 * Spoken summary of the node the keyboard just landed on: the canvas is a single
 * `role="application"` element, so screen readers only learn about the selection through
 * this text (announced in a polite live region).
 */
export function describeNode(t: T, node: SceneNode): string {
  const parts = [node.node.label.trim() || t('canvas.node.empty')];
  if (node.done) parts.push(t('canvas.node.done'));
  if (node.locked) parts.push(t('canvas.node.locked'));
  if (node.hiddenCount > 0) parts.push(t('canvas.view.hiddenCount', { count: node.hiddenCount }));
  return parts.join(', ');
}

/** Announcement for the current selection: one node is described, several are counted. */
export function describeSelection(t: T, nodes: readonly SceneNode[]): string {
  if (nodes.length === 0) return '';
  if (nodes.length === 1) return describeNode(t, nodes[0] as SceneNode);
  return t('canvas.node.selected', { count: nodes.length });
}

/**
 * Keyboard entry point when nothing is selected: the node closest to `point` (the view
 * centre), so arrows reach existing nodes without a pointer. Ties keep the first node.
 */
export function nearestNode(
  nodes: readonly SceneNode[],
  point: { readonly x: number; readonly y: number },
): SceneNode | undefined {
  let best: SceneNode | undefined;
  let bestDistance = Infinity;
  for (const node of nodes) {
    const distance = Math.hypot(node.x - point.x, node.y - point.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = node;
    }
  }
  return best;
}
