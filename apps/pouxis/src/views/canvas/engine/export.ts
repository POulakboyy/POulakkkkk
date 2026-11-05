import { graph as g } from '@pouxis/core';
import type { Graph, Id } from '@pouxis/core';
import { outlinePath, strokeOutline, type Stroke } from './ink.ts';

export type ExportFormat = 'svg' | 'png' | 'markdown' | 'opml';

export const EXPORT_TYPES: Record<ExportFormat, { ext: string; mime: string }> = {
  svg: { ext: 'svg', mime: 'image/svg+xml' },
  png: { ext: 'png', mime: 'image/png' },
  markdown: { ext: 'md', mime: 'text/markdown;charset=utf-8' },
  opml: { ext: 'opml', mime: 'text/x-opml;charset=utf-8' },
};

/** File-system-safe name from the canvas title (accents kept, separators collapsed). */
export function fileName(title: string, format: ExportFormat, fallback = 'toile'): string {
  const base =
    title
      .normalize('NFC')
      .replace(/[\\/:*?"<>|#%&{}$!'@`=+^~[\]]+/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || fallback;
  return `${base}.${EXPORT_TYPES[format].ext}`;
}

/** Ink colours exported with the drawing (light palette: exports are documents). */
const INK_EXPORT = [
  '#1c1b18',
  '#e2603f',
  '#c98a00',
  '#3f9a54',
  '#2f8bb3',
  '#5a5ad6',
  '#b04fa2',
  '#7d7464',
  '#3d8f7f',
];

/** Standalone SVG: the engine's graph drawing plus the freehand strokes on top. */
export function exportSvg(graph: Graph, strokes: readonly Stroke[]): string {
  const svg = g.toSVG(graph, { title: graph.title, background: '#ffffff' });
  if (strokes.length === 0) return svg;
  const paths = strokes
    .map((s) => {
      const d = outlinePath(strokeOutline(s.points, s.width));
      const fill = INK_EXPORT[s.color] ?? INK_EXPORT[0];
      return d ? `<path d="${d}" fill="${fill}"/>` : '';
    })
    .filter(Boolean)
    .join('\n');
  const end = svg.lastIndexOf('</svg>');
  return `${svg.slice(0, end)}<g>${paths}</g>\n${svg.slice(end)}`;
}

export function exportMarkdown(graph: Graph, doneIds: Iterable<Id>): string {
  return g.toOutline(graph, { title: graph.title, doneIds });
}

export function exportOpml(graph: Graph): string {
  return g.toOPML(graph, { title: graph.title });
}

/** Largest PNG side in device pixels; beyond that browsers fail to allocate the bitmap. */
export const PNG_MAX_SIDE = 4096;

/**
 * Pixel size and viewport for a PNG of the whole canvas: 2× density when it fits, scaled down
 * so the longest side stays within {@link PNG_MAX_SIDE}.
 */
export function pngFrame(
  bounds: g.Rect,
  padding = 48,
): { width: number; height: number; vp: g.Viewport; dpr: number } {
  const width = Math.max(1, Math.ceil(bounds.width + 2 * padding));
  const height = Math.max(1, Math.ceil(bounds.height + 2 * padding));
  const dpr = Math.min(2, PNG_MAX_SIDE / Math.max(width, height));
  return { width, height, dpr, vp: { x: bounds.x - padding, y: bounds.y - padding, zoom: 1 } };
}

/** Triggers a browser download (works in Tauri webviews too). */
export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Reads pasted / dropped text as a tree: OPML when it looks like XML, a Markdown list otherwise. */
export function parseTreeText(
  text: string,
): { nodes: Graph['nodes']; edges: Graph['edges'] } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/^<\?xml|^<opml[\s>]/i.test(trimmed)) {
    const imported = g.fromOPML(trimmed);
    return imported.nodes.length > 0 ? imported : null;
  }
  // A single line is just text, not a list worth turning into a tree.
  if (!/^\s*([-*+]|\d+[.)])\s+/m.test(trimmed) && !/^#{1,6}\s/m.test(trimmed)) return null;
  const imported = g.fromOutline(trimmed);
  return imported.nodes.length > 0 ? imported : null;
}
