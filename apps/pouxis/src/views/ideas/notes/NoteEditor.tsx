import { useMemo, useRef, useState, type RefObject } from 'react';
import { search, type Note } from '@pouxis/core';
import { useFormat, useT } from '../../../i18n/index.ts';
import { store } from '../../../store/index.ts';
import {
  cx,
  IconButton,
  IconChevronLeft,
  IconMore,
  IconTrash,
  IconUndo,
  Menu,
  Pill,
  Popover,
  toast,
  VisuallyHidden,
} from '../../../ui/index.ts';
import { HybridEditor, type HybridEditorHandle } from '../editor/HybridEditor.tsx';
import type { WikiHandlers } from '../editor/RenderedLine.tsx';
import { noteHistory, lostBlocks, restoreBlock } from '../lib/history.ts';
import { toLines, wordCount } from '../lib/lines.ts';
import { plainText } from '../lib/markdown.ts';
import { Backlinks } from './Backlinks.tsx';
import { useDraft } from './useDraft.ts';
import s from './Notes.module.css';

/** How long the "deletion refused" hint stays visible. */
const BLOCKED_HINT_MS = 2400;

export interface NoteEditorProps {
  note: Note;
  /** Every non-sandbox note, for wiki links and backlinks. */
  notes: readonly Note[];
  typewriter: boolean;
  onTypewriterChange: (on: boolean) => void;
  onOpen: (id: string) => void;
  onBack: () => void;
  onDeleted: () => void;
  autoFocusTitle?: boolean;
}

export function NoteEditor(props: NoteEditorProps) {
  const { note, notes, typewriter } = props;
  const t = useT();
  const format = useFormat();
  const editor = useRef<HybridEditorHandle>(null);
  const [blocked, setBlocked] = useState(false);
  const blockedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [title, setTitle, flushTitle] = useDraft(note.title, (value) =>
    store.update('notes', note.id, { title: value }),
  );

  const resolver = useMemo(() => search.createLinkResolver(notes), [notes]);
  const wiki: WikiHandlers = {
    resolve: (target) => resolver.resolve(target)[0],
    open: props.onOpen,
    create: (name) => {
      const created = store.create('notes', { title: name, body: '', tags: [], links: [] });
      props.onOpen(created.id);
    },
    createLabel: (name) => t('ideas.notes.createLinked', { title: name }),
  };

  const onBlocked = () => {
    setBlocked(true);
    if (blockedTimer.current) clearTimeout(blockedTimer.current);
    blockedTimer.current = setTimeout(() => setBlocked(false), BLOCKED_HINT_MS);
  };

  const remove = () => {
    store.remove('notes', note.id);
    noteHistory.clear(note.id);
    props.onDeleted();
    toast({
      title: t('ideas.notes.deleted'),
      action: { label: t('common.undo'), onClick: () => store.undo() },
    });
  };

  const words = wordCount(toLines(note.body).map(plainText).join(' '));

  return (
    <article className={s.editor} aria-label={title || t('ideas.notes.untitled')}>
      <div className={s.editorBar}>
        <IconButton
          className={s.back}
          label={t('ideas.notes.back')}
          icon={<IconChevronLeft />}
          variant="ghost"
          onClick={props.onBack}
        />
        <span className={s.spacer} />
        <div className={s.tools}>
          <Pill
            size="sm"
            selected={typewriter}
            onSelectedChange={props.onTypewriterChange}
            title={t('ideas.typewriter.hint')}
          >
            {t('ideas.typewriter.toggle')}
          </Pill>
          <HistoryButton noteId={note.id} editor={editor} />
          <Menu
            label={t('ideas.notes.more')}
            trigger={
              <IconButton label={t('ideas.notes.more')} icon={<IconMore />} variant="ghost" />
            }
            items={[
              {
                id: 'delete',
                label: t('ideas.notes.delete'),
                icon: <IconTrash />,
                danger: true,
                onSelect: remove,
              },
            ]}
          />
        </div>
      </div>

      <input
        className={s.title}
        value={title}
        placeholder={t('ideas.notes.titlePlaceholder')}
        aria-label={t('ideas.notes.titleLabel')}
        autoFocus={props.autoFocusTitle}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={flushTitle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || (e.key === 'ArrowDown' && !e.shiftKey)) {
            e.preventDefault();
            flushTitle();
            editor.current?.focusLine(0, 0);
          }
        }}
      />

      <p className={s.meta}>
        {t('ideas.notes.edited', { time: format.relativeTime(note.updatedAt) })}
        <span aria-hidden="true"> · </span>
        {t('ideas.notes.words', { count: words })}
      </p>
      <p
        className={cx(s.typewriterStatus, typewriter && s.typewriterOn)}
        role="status"
        aria-live="polite"
      >
        {typewriter ? (blocked ? t('ideas.typewriter.blocked') : t('ideas.typewriter.on')) : ''}
      </p>

      <HybridEditor
        ref={editor}
        noteId={note.id}
        body={note.body}
        onChange={(next) => store.update('notes', note.id, { body: next })}
        typewriter={typewriter}
        onBlocked={onBlocked}
        wiki={wiki}
        label={t('ideas.notes.bodyLabel')}
        placeholder={t('ideas.notes.bodyPlaceholder')}
        taskLabel={t('ideas.notes.toggleTask')}
      />

      <Backlinks note={note} notes={notes} onOpen={props.onOpen} />
    </article>
  );
}

function HistoryButton({
  noteId,
  editor,
}: {
  noteId: string;
  editor: RefObject<HybridEditorHandle | null>;
}) {
  const t = useT();
  const format = useFormat();
  const [open, setOpen] = useState(false);
  const lost =
    open && editor.current ? lostBlocks(editor.current.lines(), noteHistory.get(noteId)) : [];

  return (
    <Popover
      label={t('ideas.notes.history')}
      open={open}
      onOpenChange={setOpen}
      placement="bottom-end"
      trigger={<IconButton label={t('ideas.notes.history')} icon={<IconUndo />} variant="ghost" />}
    >
      {({ close }) => (
        <div className={s.history}>
          <p className={s.historyTitle}>{t('ideas.notes.history')}</p>
          <p className={s.historyHint}>{t('ideas.notes.historyHint')}</p>
          {lost.length === 0 ? (
            <p className={s.historyEmpty}>{t('ideas.notes.historyEmpty')}</p>
          ) : (
            <ul className={s.historyList}>
              {lost.map((block) => (
                <li key={`${block.index}:${block.text}`}>
                  <button
                    type="button"
                    className={s.historyItem}
                    onClick={() => {
                      const handle = editor.current;
                      if (!handle) return;
                      handle.setLines(restoreBlock(handle.lines(), block));
                      toast({ title: t('ideas.notes.restored') });
                      close();
                    }}
                  >
                    <span className={s.historyText}>{plainText(block.text) || block.text}</span>
                    <span className={s.historyTime}>
                      {format.time(block.at)}
                      <VisuallyHidden> · {t('ideas.notes.restoreBlock')}</VisuallyHidden>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Popover>
  );
}
