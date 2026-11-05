/**
 * Ideas (module 5): notes with a hybrid Markdown editor and backlinks, the creative studio,
 * the friction journal and the sandbox. Route: `#/ideas?tab=studio`, `#/ideas?note=<id>`.
 */
import { useEffect, useMemo } from 'react';
import { navigate, useRoute } from '../../app/router.ts';
import { useT } from '../../i18n/index.ts';
import { store, useCollection } from '../../store/index.ts';
import { Button, IconBolt, Kbd, Tabs, useHotkeys } from '../../ui/index.ts';
import { AmbientControl } from './ambient/AmbientControl.tsx';
import { BrainDumpHost } from './dump/BrainDump.tsx';
import { brainDump } from './dump/brainDump.ts';
import { FrictionJournal } from './journal/FrictionJournal.tsx';
import { linkableNotes } from './lib/notes.ts';
import { BRAIN_DUMP_HOTKEY, parseTab, type IdeasTab } from './lib/route.ts';
import { installSandboxLifecycle } from './lib/sandbox.ts';
import { NotesPane } from './notes/NotesPane.tsx';
import { SandboxPane } from './sandbox/SandboxPane.tsx';
import { Studio } from './studio/Studio.tsx';
import s from './Ideas.module.css';

export default function IdeasView() {
  const t = useT();
  const route = useRoute();
  const notes = useCollection('notes');
  const linkable = useMemo(() => linkableNotes(notes), [notes]);
  const noteId = route.params.get('note') ?? undefined;
  const tab = noteId ? 'notes' : parseTab(route.params.get('tab'));

  useEffect(() => installSandboxLifecycle(store), []);
  useHotkeys({ [BRAIN_DUMP_HOTKEY]: () => brainDump.open() });

  const openNote = (id: string | undefined) =>
    navigate('ideas', id ? { note: id } : tab === 'notes' ? {} : { tab });
  const openTab = (next: IdeasTab) => navigate('ideas', next === 'notes' ? {} : { tab: next });

  return (
    <div className={s.view}>
      <header className={s.header}>
        <div className={s.heading}>
          <h1 className={s.title}>{t('ideas.title')}</h1>
          <p className={s.subtitle}>{t('ideas.subtitle')}</p>
        </div>
        <div className={s.actions}>
          <AmbientControl />
          <Button
            iconStart={<IconBolt />}
            iconEnd={<Kbd className={s.kbd} keys={BRAIN_DUMP_HOTKEY} />}
            onClick={() => brainDump.open()}
            aria-keyshortcuts="Alt+D"
          >
            {t('ideas.brainDump.open')}
          </Button>
        </div>
      </header>

      <Tabs<IdeasTab>
        label={t('ideas.tabs.label')}
        value={tab}
        onChange={openTab}
        className={s.tabs}
        items={[
          {
            value: 'notes',
            label: t('ideas.tabs.notes'),
            panel: (
              <NotesPane
                selectedId={noteId}
                onSelect={openNote}
                onBrainDump={() => brainDump.open()}
              />
            ),
          },
          {
            value: 'studio',
            label: t('ideas.tabs.studio'),
            panel: <Studio notes={linkable} onOpen={openNote} />,
          },
          { value: 'journal', label: t('ideas.tabs.journal'), panel: <FrictionJournal /> },
          {
            value: 'sandbox',
            label: t('ideas.tabs.sandbox'),
            panel: <SandboxPane onKept={openNote} />,
          },
        ]}
      />
      <BrainDumpHost />
    </div>
  );
}
