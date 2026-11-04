/**
 * Vector export (4.11): a self-contained SVG of the canvas, transparent by default so it can be
 * dropped on any slide. PNG and PDF are rasterised from this SVG by the app.
 *
 * Every label and every colour is XML-escaped, so a label such as `</text><script>` stays text.
 * Collapsed branches are drawn as on screen (hidden nodes left out, "+N" badge) unless
 * `respectCollapsed` is false.
 */
import type { GraphNode, Id } from '../model.ts';
import { visibleSubgraph } from './collapse.ts';
import { escapeXml } from './opml.ts';
import { indexNodes } from './positions.ts';
import type { GraphLike, Point, Rect } from './types.ts';

export interface SvgExportOptions {
  /** Node fills by `color` index: `palette[color - 1]` (`color` is 1-based, like `--cat-*`). */
  palette?: readonly string[];
  /** Fill of nodes without a colour (default white). */
  nodeFill?: string;
  nodeStroke?: string;
  textColor?: string;
  edgeColor?: string;
  /** Page background; omitted (transparent) by default. */
  background?: string;
  fontFamily?: string;
  /** Default 14. */
  fontSize?: number;
  /** Node box height (default 2.75 × fontSize) and width limits (default 72–240). */
  nodeHeight?: number;
  minNodeWidth?: number;
  maxNodeWidth?: number;
  /** Margin around the drawing (default 32). */
  padding?: number;
  /** Accessible title of the image. */
  title?: string;
  /** Draw only what is visible on screen (default true). */
  respectCollapsed?: boolean;
}

/** Light values of the `--cat-1`…`--cat-8` tokens, used when no palette is given. */
export const DEFAULT_PALETTE: readonly string[] = [
  '#ffd8cc',
  '#ffe9a8',
  '#cdefd6',
  '#cfe3ff',
  '#e3d5ff',
  '#ffd3e6',
  '#d4f0ef',
  '#ede6da',
];

/** Average advance of a glyph in em for proportional UI fonts; enough to size boxes offline. */
const CHAR_WIDTH_EM = 0.58;

interface Box extends Rect {
  node: GraphNode;
  text: string;
}

export function toSVG(graph: GraphLike, options: SvgExportOptions = {}): string {
  const fontSize = positive(options.fontSize, 14);
  const height = positive(options.nodeHeight, fontSize * 2.75);
  const minWidth = positive(options.minNodeWidth, 72);
  const maxWidth = Math.max(minWidth, positive(options.maxNodeWidth, 240));
  const padding = Math.max(0, options.padding ?? 32);
  const palette = options.palette ?? DEFAULT_PALETTE;

  const visible =
    options.respectCollapsed === false
      ? { nodes: graph.nodes, edges: graph.edges, hiddenCount: new Map<Id, number>() }
      : visibleSubgraph(graph);
  const boxes = new Map<Id, Box>();
  for (const node of indexNodes(visible.nodes).values()) {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
    // Code points, not UTF-16 units, so truncation never splits an emoji.
    const chars = Array.from(node.label.replace(/\s+/g, ' ').trim());
    const inner = fontSize * 1.5;
    const maxChars = Math.max(1, Math.floor((maxWidth - inner) / (fontSize * CHAR_WIDTH_EM)));
    const shown = chars.length > maxChars ? [...chars.slice(0, maxChars - 1), '…'] : chars;
    const text = shown.join('').replace(/\s+…$/, '…');
    const width = Math.min(
      maxWidth,
      Math.max(minWidth, shown.length * fontSize * CHAR_WIDTH_EM + inner),
    );
    boxes.set(node.id, {
      node,
      text,
      x: node.x - width / 2,
      y: node.y - height / 2,
      width,
      height,
    });
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes.values()) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  if (boxes.size === 0) minX = minY = maxX = maxY = 0;
  const vx = minX - padding;
  const vy = minY - padding;
  const vw = maxX - minX + 2 * padding;
  const vh = maxY - minY + 2 * padding;

  const textColor = escapeXml(options.textColor ?? '#1c1b1f');
  const edgeColor = escapeXml(options.edgeColor ?? '#8e8a93');
  const nodeStroke = escapeXml(options.nodeStroke ?? '#d8d4dc');
  const nodeFill = options.nodeFill ?? '#ffffff';
  const font = escapeXml(options.fontFamily ?? 'system-ui, -apple-system, "Segoe UI", sans-serif');

  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(vx)} ${n(vy)} ${n(vw)} ${n(vh)}" ` +
      `width="${n(vw)}" height="${n(vh)}" font-family="${font}" font-size="${n(fontSize)}"` +
      `${options.title !== undefined ? ' role="img"' : ''}>`,
  ];
  if (options.title !== undefined) out.push(`<title>${escapeXml(options.title)}</title>`);
  out.push(
    '<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" ' +
      `markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${edgeColor}"/>` +
      '</marker></defs>',
  );
  if (options.background !== undefined) {
    out.push(
      `<rect x="${n(vx)}" y="${n(vy)}" width="${n(vw)}" height="${n(vh)}" ` +
        `fill="${escapeXml(options.background)}"/>`,
    );
  }

  out.push(`<g fill="none" stroke="${edgeColor}" stroke-width="1.5">`);
  for (const edge of visible.edges) {
    const a = boxes.get(edge.from);
    const b = boxes.get(edge.to);
    if (!a || !b || a === b) continue;
    const start = clipToBox(a, center(b));
    const end = clipToBox(b, center(a));
    const dash = edge.condition === 'on-complete' ? ' stroke-dasharray="6 4"' : '';
    out.push(
      `<line x1="${n(start.x)}" y1="${n(start.y)}" x2="${n(end.x)}" y2="${n(end.y)}"${dash} ` +
        'marker-end="url(#arrow)"/>',
    );
    if (edge.label) {
      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2;
      out.push(
        `<text x="${n(mx)}" y="${n(my - 4)}" fill="${textColor}" stroke="none" ` +
          `font-size="${n(fontSize * 0.85)}" text-anchor="middle">${escapeXml(edge.label)}</text>`,
      );
    }
  }
  out.push('</g>');

  const radius = height / 2;
  for (const b of boxes.values()) {
    const color = b.node.color;
    const fill = (color !== undefined ? palette[color - 1] : undefined) ?? nodeFill;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    out.push(
      `<g><rect x="${n(b.x)}" y="${n(b.y)}" width="${n(b.width)}" height="${n(b.height)}" ` +
        `rx="${n(radius)}" fill="${escapeXml(fill)}" stroke="${nodeStroke}"/>` +
        `<text x="${n(cx)}" y="${n(cy)}" fill="${textColor}" text-anchor="middle" ` +
        `dominant-baseline="central">${escapeXml(b.text)}</text>`,
    );
    const hidden = visible.hiddenCount.get(b.node.id);
    if (hidden) {
      const bx = b.x + b.width;
      const by = b.y;
      out.push(
        `<circle cx="${n(bx)}" cy="${n(by)}" r="${n(fontSize * 0.9)}" fill="${edgeColor}"/>` +
          `<text x="${n(bx)}" y="${n(by)}" fill="#ffffff" font-size="${n(fontSize * 0.75)}" ` +
          `text-anchor="middle" dominant-baseline="central">+${hidden}</text>`,
      );
    }
    out.push('</g>');
  }
  out.push('</svg>');
  return `${out.join('\n')}\n`;
}

function center(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Point where the segment from the centre of `rect` towards `target` leaves the rectangle. */
export function clipToBox(rect: Rect, target: Point): Point {
  const c = center(rect);
  const dx = target.x - c.x;
  const dy = target.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const sx = dx !== 0 ? rect.width / 2 / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? rect.height / 2 / Math.abs(dy) : Infinity;
  const s = Math.min(1, sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

/** Compact number formatting: at most two decimals, no `-0`. */
function n(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function positive(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}
