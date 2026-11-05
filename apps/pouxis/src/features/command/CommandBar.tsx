import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { navigate } from '../../app/router.ts';
import { useT, type MessageKey } from '../../i18n/index.ts';
import { useCollection, usePrefs } from '../../store/index.ts';
import {
  Button,
  IconArrowUp,
  IconCalendar,
  IconCanvas,
  IconIdeas,
  IconMic,
  IconSearch,
  IconTasks,
  IconToday,
  Kbd,
  Portal,
  VisuallyHidden,
  cx,
  useFocusTrap,
  usePresence,
  useScrollLock,
} from '../../ui/index.ts';
import { canBeEvent } from './capture.ts';
import { buildCommands, filterCommands, type CommandItem } from './commands.ts';
import { Composer } from './Composer.tsx';
import { PreviewRow } from './Preview.tsx';
import {
  buildSearchIndex,
  recordRoute,
  searchGrouped,
  type ResultGroup,
  type ResultItem,
} from './results.ts';
import { closeCommandBar, useCommandBar } from './state.ts';
import { useCapture, type CaptureModel } from './useCapture.ts';
import { useDictation } from './voice.ts';
import s from './CommandBar.module.css';

type Option =
  | { type: 'create'; id: string }
  | { type: 'command'; id: string; item: CommandItem }
  | { type: 'record'; id: string; item: ResultItem };

interface Section {
  id: string;
  title: string;
  options: Option[];
}

const GROUP_TITLE: Record<ResultGroup, MessageKey> = {
  tasks: 'command.sections.tasks',
  events: 'command.sections.events',
  notes: 'command.sections.notes',
  graphs: 'command.sections.canvases',
  journal: 'command.sections.journal',
};

const GROUP_ICON: Record<ResultGroup, typeof IconTasks> = {
  tasks: IconTasks,
  events: IconCalendar,
  notes: IconIdeas,
  graphs: IconCanvas,
  journal: IconToday,
};

/** Commands offered before anything is typed. */
const SUGGESTED = ['note.new', 'focus.start', 'go.today', 'theme.cycle', 'zen.toggle'];

/** The ⌘K overlay: centred composer on wide screens, bottom sheet on phones. */
export function CommandBar() {
  const { open, initialText, session } = useCommandBar();
  const presence = usePresence<HTMLDivElement>(open);
  if (!presence.mounted) return null;
  return (
    <Portal>
      <div ref={presence.ref} className={s.root} data-state={presence.state}>
        <div className={s.backdrop} onClick={closeCommandBar} aria-hidden="true" />
        <CommandPanel key={session} initialText={initialText} active={open} />
      </div>
    </Portal>
  );
}

function useSearchIndex(enabled: boolean) {
  const tasks = useCollection('tasks');
  const events = useCollection('events');
  const notes = useCollection('notes');
  const graphs = useCollection('graphs');
  const journal = useCollection('journal');
  return useMemo(
    () => (enabled ? buildSearchIndex({ tasks, events, notes, graphs, journal }) : null),
    [enabled, tasks, events, notes, graphs, journal],
  );
}

function useSections(model: CaptureModel, ids: { prefix: string }): Section[] {
  const t = useT();
  const commands = useMemo(() => buildCommands(t), [t]);
  const text = model.text;
  const commandMode = text.startsWith('/');
  // Search what the line is about (its title and tags), not the date and time words.
  const only = model.plan.items.length === 1 ? model.plan.items[0] : undefined;
  const subject = only ? [only.result.title, ...only.result.tags].join(' ') : text;
  const query = commandMode ? text.slice(1) : subject.trim();
  const index = useSearchIndex(!commandMode && !text.includes('\n'));

  return useMemo(() => {
    const opt = (o: Option) => ({ ...o, id: `${ids.prefix}-${o.id}` });
    if (commandMode) {
      const list = filterCommands(commands, query).map((item) =>
        opt({ type: 'command', id: `c-${item.id}`, item }),
      );
      return [{ id: 'commands', title: t('command.sections.commands'), options: list }];
    }
    if (text.trim() === '') {
      const suggested = SUGGESTED.flatMap((id) => commands.filter((c) => c.id === id)).map((item) =>
        opt({ type: 'command', id: `c-${item.id}`, item }),
      );
      return [{ id: 'suggestions', title: t('command.sections.suggestions'), options: suggested }];
    }
    const sections: Section[] = [];
    if (model.plan.items.some((i) => i.draft)) {
      sections.push({
        id: 'create',
        title: t('command.sections.create'),
        options: [opt({ type: 'create', id: 'create' })],
      });
    }
    if (index) {
      for (const group of searchGrouped(index, query)) {
        sections.push({
          id: group.collection,
          title: t(GROUP_TITLE[group.collection]),
          options: group.items.map((item) => opt({ type: 'record', id: `r-${item.id}`, item })),
        });
      }
    }
    return sections;
  }, [commandMode, commands, query, text, model.plan.items, index, t, ids.prefix]);
}

function CommandPanel({ initialText, active }: { initialText: string; active: boolean }) {
  const t = useT();
  const { locale } = usePrefs();
  const prefix = useId().replace(/:/g, '');
  const listId = `${prefix}-list`;
  const hintId = `${prefix}-hint`;
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const model = useCapture(initialText);
  const sections = useSections(model, { prefix });
  const options = useMemo(() => sections.flatMap((sec) => sec.options), [sections]);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeOption = options[Math.min(activeIndex, options.length - 1)];

  useFocusTrap(panel, active, { initialFocus: input });
  useScrollLock(active);

  // A new result list starts from its first option.
  useEffect(() => setActiveIndex(0), [model.text]);

  // Put the caret after a prefilled text (e.g. `/`).
  useEffect(() => {
    const el = input.current;
    if (el && initialText) el.setSelectionRange(initialText.length, initialText.length);
  }, [initialText]);

  const dictation = useDictation({
    locale,
    onText: (spoken) => {
      const base = model.text.trimEnd();
      model.setText(base === '' ? spoken : `${base}\n${spoken}`);
      input.current?.focus();
    },
  });

  const run = (option: Option | undefined) => {
    if (!option) return;
    if (option.type === 'create') {
      if (model.commit().length > 0) closeCommandBar();
      return;
    }
    closeCommandBar();
    if (option.type === 'command') option.item.run();
    else {
      const route = recordRoute(option.item.collection, option.item.id);
      navigate(route.view, route.params);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    const multiline = model.text.includes('\n');
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeCommandBar();
    } else if (e.key === 'Tab' && !e.shiftKey && model.completion) {
      e.preventDefault();
      const caret = model.acceptCompletion();
      if (caret !== null)
        requestAnimationFrame(() => input.current?.setSelectionRange(caret, caret));
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !multiline && options.length > 0) {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((i) => (i + step + options.length) % options.length);
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      run({ type: 'create', id: 'create' });
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      run(activeOption);
    }
  };

  const single = model.plan.items.length === 1 ? model.plan.items[0] : undefined;
  const canCreate = model.plan.items.some((i) => i.draft);
  const commandMode = model.text.startsWith('/');
  const query = commandMode ? model.text.slice(1) : model.text;

  const intent =
    model.plan.items.length > 1
      ? t('command.intent.many', { count: model.plan.items.length })
      : single?.kind === 'event'
        ? t('command.intent.event')
        : t('command.intent.task');

  const status = model.completion ? (
    <span className={s.hint}>
      <Kbd keys="tab" /> {t('command.suggestion', { value: model.completion.value })}
    </span>
  ) : dictation.status === 'listening' ? (
    <span className={s.listening} role="status">
      <span className={s.pulse} aria-hidden="true" />
      {dictation.interim || t('command.voice.listening')}
    </span>
  ) : dictation.status === 'denied' || dictation.status === 'failed' ? (
    <span className={s.hint} role="status">
      {t(dictation.status === 'denied' ? 'command.voice.denied' : 'command.voice.failed')}
    </span>
  ) : (
    <span className={cx(s.hint, s.syntax)}>
      {t(commandMode ? 'command.hints.navigate' : 'command.hints.syntax')}
    </span>
  );

  const toolbar = (
    <>
      {single && canBeEvent(single.result) && !commandMode && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => model.setOverride(single.kind === 'event' ? 'task' : 'event')}
        >
          {t(single.kind === 'event' ? 'command.preview.asTask' : 'command.preview.asEvent')}
        </Button>
      )}
      {dictation.supported && (
        <button
          type="button"
          className={s.toolButton}
          aria-pressed={dictation.status === 'listening'}
          aria-label={t(
            dictation.status === 'listening' ? 'command.voice.stop' : 'command.voice.start',
          )}
          title={t(dictation.status === 'listening' ? 'command.voice.stop' : 'command.voice.start')}
          onClick={dictation.status === 'listening' ? dictation.stop : dictation.start}
        >
          <IconMic size={20} />
        </button>
      )}
      <button
        type="button"
        className={s.submit}
        aria-label={intent}
        title={intent}
        disabled={!canCreate || commandMode}
        onClick={() => run({ type: 'create', id: 'create' })}
      >
        <IconArrowUp size={20} />
      </button>
    </>
  );

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label={t('command.a11y')}
      className={s.panel}
    >
      <div className={s.grabber} aria-hidden="true" />
      <Composer
        value={model.text}
        onChange={(v, caret) => model.setText(v, caret)}
        onSelect={model.setCaret}
        onKeyDown={onKeyDown}
        tokens={commandMode ? [] : model.plan.tokens}
        label={t('command.input')}
        placeholder={
          commandMode ? t('command.placeholder.commands') : t('command.placeholder.default')
        }
        inputRef={input}
        controls={listId}
        activeDescendant={activeOption?.id}
        describedBy={hintId}
        status={status}
        toolbar={toolbar}
      />

      <div id={listId} role="listbox" aria-label={t('command.a11y')} className={s.results}>
        {sections.map((section) => (
          <div key={section.id} role="group" aria-labelledby={`${prefix}-${section.id}`}>
            <div id={`${prefix}-${section.id}`} className={s.sectionTitle}>
              {section.title}
            </div>
            {section.options.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                model={model}
                selected={option.id === activeOption?.id}
                onHover={() => setActiveIndex(options.indexOf(option))}
                onRun={() => run(option)}
              />
            ))}
          </div>
        ))}
        {commandMode && options.length === 0 && (
          <p className={s.empty}>{t('command.noMatch', { query })}</p>
        )}
      </div>

      <div className={s.footer} id={hintId}>
        <span>
          <Kbd keys="enter" /> {t('command.hints.select', { key: '' }).trim()}
        </span>
        <span>
          <Kbd keys="shift+enter" /> {t('command.hints.newLine', { key: '' }).trim()}
        </span>
        <span>
          <Kbd keys="/" /> {t('command.hints.commands', { key: '' }).trim()}
        </span>
        <span className={s.footerEnd}>
          <Kbd keys="escape" /> {t('command.hints.close', { key: '' }).trim()}
        </span>
      </div>
      <VisuallyHidden aria-live="polite">
        {model.text.trim() !== '' && !commandMode
          ? t('common.search.results', {
              count: options.filter((o) => o.type === 'record').length,
            })
          : ''}
      </VisuallyHidden>
    </div>
  );
}

function OptionRow({
  option,
  model,
  selected,
  onHover,
  onRun,
}: {
  option: Option;
  model: CaptureModel;
  selected: boolean;
  onHover: () => void;
  onRun: () => void;
}) {
  const t = useT();
  const common = {
    id: option.id,
    role: 'option' as const,
    'aria-selected': selected,
    className: s.option,
    onMouseMove: selected ? undefined : onHover,
    onClick: onRun,
  };
  if (option.type === 'create') {
    const items = model.plan.items.filter((i) => i.draft);
    return (
      <div {...common} className={cx(s.option, s.createOption)}>
        <span className={s.previewList}>
          {items.slice(0, 4).map((item, i) => (
            <PreviewRow key={i} item={item} />
          ))}
          {items.length > 4 && (
            <span className={s.more}>{t('common.count.more', { count: items.length - 4 })}</span>
          )}
        </span>
        <Kbd keys="enter" className={s.optionKbd} />
      </div>
    );
  }
  if (option.type === 'command') {
    const Icon = option.item.icon;
    return (
      <div {...common}>
        <span className={s.optionIcon} aria-hidden="true">
          <Icon size={18} />
        </span>
        <span className={s.optionLabel}>{option.item.label}</span>
      </div>
    );
  }
  const Icon = GROUP_ICON[option.item.collection as ResultGroup] ?? IconSearch;
  return (
    <div {...common}>
      <span className={s.optionIcon} aria-hidden="true">
        <Icon size={18} />
      </span>
      <span className={s.optionBody}>
        {/* Journal entries have no title: their text stands in for it. */}
        <span className={s.optionLabel}>{option.item.title || option.item.snippet}</span>
        {option.item.title && option.item.snippet && (
          <span className={s.snippet}>{option.item.snippet}</span>
        )}
      </span>
    </div>
  );
}
