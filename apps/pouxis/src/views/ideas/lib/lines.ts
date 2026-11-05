/**
 * Line-level editing operations of the hybrid editor. The note body is a list of lines; the
 * line being edited is a plain textarea, the others are rendered. All functions are pure.
 */
import { parseLine } from './markdown.ts';

export function toLines(body: string): string[] {
  return body.split('\n');
}

export function toBody(lines: readonly string[]): string {
  return lines.join('\n');
}

export interface Edit {
  lines: string[];
  /** Line that receives the caret after the edit. */
  line: number;
  caret: number;
}

/** Marker that continues a list or quote on the next line, or `null` to leave it. */
export function continuation(line: string): string | null {
  const block = parseLine(line);
  switch (block.kind) {
    case 'bullet':
      return block.marker;
    case 'task':
      return block.marker.replace(/\[[xX]\]/, '[ ]');
    case 'ordered':
      return block.marker.replace(/\d+/, String((block.number ?? 0) + 1));
    case 'quote':
      return block.marker;
    default:
      return null;
  }
}

function replace(
  lines: readonly string[],
  index: number,
  count: number,
  items: string[],
): string[] {
  const next = lines.slice();
  next.splice(index, count, ...items);
  return next;
}

/**
 * Enter at `caret` in line `index`: splits the line and continues lists and quotes. Enter on an
 * empty list item or quote leaves the list instead (clears the marker).
 */
export function splitLine(lines: readonly string[], index: number, caret: number): Edit {
  const line = lines[index] ?? '';
  const before = line.slice(0, caret);
  const after = line.slice(caret);
  const block = parseLine(line);
  const marker = continuation(before);
  const emptyItem = marker !== null && block.content.trim() === '' && after.trim() === '';
  if (emptyItem) return { lines: replace(lines, index, 1, ['']), line: index, caret: 0 };
  const prefix = marker ?? '';
  return {
    lines: replace(lines, index, 1, [before, prefix + after]),
    line: index + 1,
    caret: prefix.length,
  };
}

/** Backspace at the start of line `index`: joins it to the previous line. */
export function mergeWithPrevious(lines: readonly string[], index: number): Edit | null {
  if (index <= 0) return null;
  const prev = lines[index - 1] ?? '';
  return {
    lines: replace(lines, index - 1, 2, [prev + (lines[index] ?? '')]),
    line: index - 1,
    caret: prev.length,
  };
}

/** Delete at the end of line `index`: pulls the next line up. */
export function mergeWithNext(lines: readonly string[], index: number): Edit | null {
  if (index >= lines.length - 1) return null;
  const line = lines[index] ?? '';
  return {
    lines: replace(lines, index, 2, [line + (lines[index + 1] ?? '')]),
    line: index,
    caret: line.length,
  };
}

/** Replaces the selection of line `index` with `text`, which may span several lines (paste). */
export function insertText(
  lines: readonly string[],
  index: number,
  start: number,
  end: number,
  text: string,
): Edit {
  const line = lines[index] ?? '';
  const parts = text.replace(/\r\n?/g, '\n').split('\n');
  const head = line.slice(0, start);
  const tail = line.slice(end);
  if (parts.length === 1) {
    return {
      lines: replace(lines, index, 1, [head + text + tail]),
      line: index,
      caret: start + text.length,
    };
  }
  const first = head + (parts[0] ?? '');
  const lastPart = parts[parts.length - 1] ?? '';
  const middle = parts.slice(1, -1);
  return {
    lines: replace(lines, index, 1, [first, ...middle, lastPart + tail]),
    line: index + parts.length - 1,
    caret: lastPart.length,
  };
}

/** Flips the checkbox of a task line; other lines are returned unchanged. */
export function toggleTask(line: string): string {
  const block = parseLine(line);
  if (block.kind !== 'task') return line;
  const marker = block.checked
    ? block.marker.replace(/\[[xX]\]/, '[ ]')
    : block.marker.replace('[ ]', '[x]');
  return marker + block.content;
}

/** Appends a line to a body, separated by a blank line when the body ends with text. */
export function appendLine(body: string, line: string): string {
  const trimmed = body.replace(/\s+$/, '');
  return trimmed ? `${trimmed}\n\n${line}` : line;
}

export function wordCount(text: string): number {
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}’'-]*/gu)?.length ?? 0;
}
