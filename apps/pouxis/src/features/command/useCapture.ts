import { useCallback, useMemo, useState } from 'react';
import { useAppPrefs } from '../../app/appPrefs.ts';
import { navigate } from '../../app/router.ts';
import { translate } from '../../i18n/index.ts';
import { platform } from '../../platform/index.ts';
import { store, useCollection, usePrefs } from '../../store/index.ts';
import { toast } from '../../ui/index.ts';
import {
  commitCapture,
  planText,
  type CaptureKind,
  type CreatedRecord,
  type PlannedText,
} from './capture.ts';
import { recordRoute } from './results.ts';
import { applyCompletion, completeAt, knownVocabulary, type Completion } from './suggest.ts';

export interface CaptureModel {
  text: string;
  caret: number;
  plan: PlannedText;
  completion: Completion | null;
  override: CaptureKind | undefined;
  setText: (text: string, caret?: number) => void;
  setCaret: (caret: number) => void;
  setOverride: (kind: CaptureKind | undefined) => void;
  /** Applies the completion; returns the new caret, or `null` when there was none. */
  acceptCompletion: () => number | null;
  /** Creates the planned records, announces them and clears the text. */
  commit: () => CreatedRecord[];
}

/** Composer state shared by the command bar and the quick-capture window. */
export function useCapture(initialText = ''): CaptureModel {
  const prefs = usePrefs();
  const { defaultMode } = useAppPrefs();
  const [text, setTextState] = useState(initialText);
  const [caret, setCaret] = useState(initialText.length);
  const [override, setOverride] = useState<CaptureKind | undefined>(undefined);

  const tasks = useCollection('tasks');
  const events = useCollection('events');
  const notes = useCollection('notes');
  const vocabulary = useMemo(
    () => knownVocabulary([...tasks, ...events, ...notes]),
    [tasks, events, notes],
  );

  // `now` is taken when the text changes so relative dates stay stable while typing.
  const plan = useMemo(
    () =>
      planText(
        text,
        { now: Date.now(), timeZone: prefs.timeZone, locale: prefs.locale, defaultMode },
        override,
      ),
    [text, prefs.timeZone, prefs.locale, defaultMode, override],
  );

  const completion = useMemo(() => completeAt(text, caret, vocabulary), [text, caret, vocabulary]);

  const setText = useCallback((next: string, nextCaret = next.length) => {
    setTextState(next);
    setCaret(nextCaret);
    if (next.trim() === '') setOverride(undefined);
  }, []);

  const acceptCompletion = useCallback((): number | null => {
    if (!completion) return null;
    const applied = applyCompletion(text, completion);
    setText(applied.text, applied.caret);
    return applied.caret;
  }, [completion, text, setText]);

  const commit = useCallback((): CreatedRecord[] => {
    const created = commitCapture(store, plan.items);
    if (created.length > 0) {
      announceCreated(created, prefs.locale);
      platform.haptic('success');
      setText('');
    }
    return created;
  }, [plan.items, prefs.locale, setText]);

  return {
    text,
    caret,
    plan,
    completion,
    override,
    setText,
    setCaret,
    setOverride,
    acceptCompletion,
    commit,
  };
}

/** Spark-style confirmation: say what happened, offer to undo, link to the record. */
export function announceCreated(created: readonly CreatedRecord[], locale = store.prefs().locale) {
  const t = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) =>
    translate(locale, key, vars);
  const first = created[0];
  if (!first) return;
  const single = created.length === 1;
  toast({
    id: 'capture',
    tone: 'success',
    title: single
      ? t('command.result.created', { kind: first.collection === 'events' ? 'event' : 'task' })
      : t('command.result.createdMany', { count: created.length }),
    description: single ? first.title : created.map((c) => c.title).join(' · '),
    action: single
      ? {
          label: t('command.result.open'),
          onClick: () => {
            const route = recordRoute(first.collection, first.id);
            navigate(route.view, route.params);
          },
        }
      : { label: t('common.undo'), onClick: () => void store.undo() },
  });
}
