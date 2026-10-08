/**
 * Global overlay stack. Decides which overlay receives Escape, and makes everything outside the
 * top-most modal `inert` (no focus, no clicks, hidden from assistive tech).
 */

interface Layer {
  id: number;
  node: HTMLElement;
  modal: boolean;
  onEscape?: (() => void) | undefined;
}

const stack: Layer[] = [];
const inerted = new Set<Element>();
let nextId = 1;
let listening = false;

export interface LayerOptions {
  node: HTMLElement;
  /** Modal layers make the rest of the page inert. */
  modal: boolean;
  /** Called when Escape is pressed and this is the top-most layer. */
  onEscape?: () => void;
}

/** Registers an overlay; returns its unregister function. */
export function pushLayer(options: LayerOptions): () => void {
  const layer: Layer = { id: nextId++, ...options };
  stack.push(layer);
  options.node.setAttribute('data-px-layer', String(layer.id));
  syncInert();
  ensureListener();
  return () => {
    const i = stack.indexOf(layer);
    if (i >= 0) stack.splice(i, 1);
    syncInert();
    if (stack.length === 0) removeListener();
  };
}

/** Whether `node` belongs to the top-most layer. */
export function isTopLayer(node: HTMLElement | null): boolean {
  const top = stack[stack.length - 1];
  return !!top && !!node && top.node === node;
}

/** Number of registered layers (tests, debugging). */
export function layerCount(): number {
  return stack.length;
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  for (let i = stack.length - 1; i >= 0; i--) {
    const layer = stack[i]!;
    if (!layer.onEscape) continue;
    e.preventDefault();
    e.stopPropagation();
    layer.onEscape();
    return;
  }
}

function ensureListener() {
  if (listening) return;
  listening = true;
  document.addEventListener('keydown', onKeyDown);
}

function removeListener() {
  if (!listening) return;
  listening = false;
  document.removeEventListener('keydown', onKeyDown);
}

function syncInert() {
  for (const el of inerted) el.removeAttribute('inert');
  inerted.clear();
  let topModal = -1;
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i]!.modal) {
      topModal = i;
      break;
    }
  }
  if (topModal < 0) return;
  const keep = new Set<Element>(stack.slice(topModal).map((l) => l.node));
  // Walk from each kept node up to <body>, inerting the siblings of every ancestor.
  const keepAncestors = new Set<Element>();
  for (const node of keep) {
    let el: Element | null = node;
    while (el && el !== document.body) {
      keepAncestors.add(el);
      el = el.parentElement;
    }
  }
  for (const node of keepAncestors) {
    const parent = node.parentElement;
    if (!parent) continue;
    for (const sibling of Array.from(parent.children)) {
      if (keepAncestors.has(sibling)) continue;
      if (sibling.hasAttribute('inert')) continue;
      if (sibling.matches('script, style, link, [data-px-inert-exempt]')) continue;
      sibling.setAttribute('inert', '');
      inerted.add(sibling);
    }
  }
}
