/**
 * Maps a caret offset in a rendered line (markers and emphasis hidden) back to the Markdown
 * source. The rendered text is, character for character, a subsequence of the source content
 * almost everywhere, so a greedy alignment is exact for plain text and close for the rest.
 */
export function sourceOffset(source: string, rendered: string, renderedOffset: number): number {
  const target = Math.min(Math.max(0, renderedOffset), rendered.length);
  let j = 0;
  for (let i = 0; i < target; i++) {
    const ch = rendered[i];
    const found = source.indexOf(ch ?? '', j);
    if (found === -1) return source.length;
    j = found + 1;
  }
  // Skip closing markers right after the caret (`**`, `]]`…) only when the caret is at the end.
  return target === rendered.length ? source.length : j;
}

/** Offset of a point inside `root`'s text, or `null` when the browser cannot tell. */
export function renderedOffsetAt(root: HTMLElement, x: number, y: number): number | null {
  const doc = root.ownerDocument;
  const point = caretPoint(doc, x, y);
  if (!point || !root.contains(point.node)) return null;
  const range = doc.createRange();
  range.selectNodeContents(root);
  try {
    range.setEnd(point.node, point.offset);
  } catch {
    return null;
  }
  return range.toString().length;
}

type CaretDoc = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

function caretPoint(doc: Document, x: number, y: number): { node: Node; offset: number } | null {
  const d = doc as CaretDoc;
  if (typeof d.caretPositionFromPoint === 'function') {
    const pos = d.caretPositionFromPoint(x, y);
    return pos ? { node: pos.offsetNode, offset: pos.offset } : null;
  }
  if (typeof d.caretRangeFromPoint === 'function') {
    const range = d.caretRangeFromPoint(x, y);
    return range ? { node: range.startContainer, offset: range.startOffset } : null;
  }
  return null;
}
