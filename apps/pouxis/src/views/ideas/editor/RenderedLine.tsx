import type { ReactNode } from 'react';
import { cx } from '../../../ui/index.ts';
import { parseInline, parseLine, type Block, type Inline } from '../lib/markdown.ts';
import s from './Editor.module.css';

export interface WikiHandlers {
  /** Id of the note a `[[target]]` points to, if it exists. */
  resolve: (target: string) => string | undefined;
  open: (id: string) => void;
  create: (title: string) => void;
  createLabel: (title: string) => string;
}

export function InlineNodes({ nodes, wiki }: { nodes: Inline[]; wiki: WikiHandlers }): ReactNode {
  return nodes.map((node, i) => <InlineNode key={i} node={node} wiki={wiki} />);
}

function InlineNode({ node, wiki }: { node: Inline; wiki: WikiHandlers }): ReactNode {
  switch (node.type) {
    case 'text':
      return node.text;
    case 'code':
      return <code className={s.code}>{node.text}</code>;
    case 'strong':
      return (
        <strong>
          <InlineNodes nodes={node.children} wiki={wiki} />
        </strong>
      );
    case 'em':
      return (
        <em>
          <InlineNodes nodes={node.children} wiki={wiki} />
        </em>
      );
    case 'strike':
      return (
        <s>
          <InlineNodes nodes={node.children} wiki={wiki} />
        </s>
      );
    case 'link':
      return (
        <a className={s.link} href={node.href} target="_blank" rel="noopener noreferrer">
          {node.label}
        </a>
      );
    case 'wiki':
      return <WikiLink target={node.target} label={node.label} wiki={wiki} />;
  }
}

function WikiLink({ target, label, wiki }: { target: string; label: string; wiki: WikiHandlers }) {
  const id = wiki.resolve(target);
  if (id) {
    return (
      <a
        className={s.wiki}
        href={`#/ideas?note=${encodeURIComponent(id)}`}
        onClick={(e) => {
          e.preventDefault();
          wiki.open(id);
        }}
      >
        {label}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={cx(s.wiki, s.wikiMissing)}
      title={wiki.createLabel(target)}
      onClick={() => wiki.create(target)}
    >
      {label}
    </button>
  );
}

export interface RenderedLineProps {
  line: string;
  wiki: WikiHandlers;
  onToggleTask: () => void;
  taskLabel: string;
}

/** Class applied to a line (rendered or being edited) according to its block kind. */
export function blockClass(block: Block): string | undefined {
  if (block.kind === 'heading') return cx(s.heading, s[`h${block.level ?? 1}`]);
  return s[block.kind];
}

/** A line as read: Markdown markers hidden, inline formatting rendered. */
export function RenderedLine({ line, wiki, onToggleTask, taskLabel }: RenderedLineProps) {
  const block = parseLine(line);
  const depth = block.depth ?? 0;
  const content = (
    <span className={s.content} data-content="">
      <InlineNodes nodes={parseInline(block.content)} wiki={wiki} />
    </span>
  );
  switch (block.kind) {
    case 'blank':
      return <span className={s.content} data-content="" />;
    case 'rule':
      return <hr className={s.ruleLine} />;
    case 'bullet':
      return (
        <span className={s.item} style={{ paddingInlineStart: `${depth * 1.5}em` }}>
          <span className={s.bulletMark} aria-hidden="true" />
          {content}
        </span>
      );
    case 'ordered':
      return (
        <span className={s.item} style={{ paddingInlineStart: `${depth * 1.5}em` }}>
          <span className={s.number} aria-hidden="true">
            {block.number}.
          </span>
          {content}
        </span>
      );
    case 'task':
      return (
        <span className={s.item} style={{ paddingInlineStart: `${depth * 1.5}em` }}>
          <button
            type="button"
            role="checkbox"
            aria-checked={block.checked === true}
            aria-label={taskLabel}
            className={s.taskBox}
            onClick={onToggleTask}
          />
          <span className={cx(s.content, block.checked && s.taskDone)} data-content="">
            <InlineNodes nodes={parseInline(block.content)} wiki={wiki} />
          </span>
        </span>
      );
    default:
      return content;
  }
}
