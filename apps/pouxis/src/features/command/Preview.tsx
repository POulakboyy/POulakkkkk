import type { Priority } from '@pouxis/core';
import { useFormat, useT, type BoundFormat, type MessageKey } from '../../i18n/index.ts';
import {
  IconCalendar,
  IconClock,
  IconFlag,
  IconHash,
  IconInbox,
  IconMapPin,
  IconRepeat,
  IconTasks,
  IconUser,
} from '../../ui/index.ts';
import type { CaptureItem } from './capture.ts';
import s from './CommandBar.module.css';

const PRIORITY_KEY: Record<Priority, MessageKey> = {
  0: 'common.priority.none',
  1: 'common.priority.low',
  2: 'common.priority.medium',
  3: 'common.priority.high',
};

interface Meta {
  key: string;
  icon: typeof IconClock;
  text: string;
}

function when(item: CaptureItem, f: BoundFormat, allDay: string): string | undefined {
  const draft = item.draft;
  if (!draft) return undefined;
  if (draft.collection === 'events') {
    const { start, end } = draft.data;
    if (item.result.allDay) return `${f.relativeDay(start)} · ${allDay}`;
    return `${f.relativeDay(start)} · ${f.timeRange(start, end)}`;
  }
  const task = draft.data;
  if (task.scheduled)
    return `${f.relativeDay(task.scheduled.start)} · ${f.time(task.scheduled.start)}`;
  if (task.floatingDay !== undefined) return f.relativeDay(task.floatingDay);
  return undefined;
}

/** Human summary of everything the parser understood, in display order. */
export function useCaptureMeta(item: CaptureItem): Meta[] {
  const t = useT();
  const f = useFormat();
  const r = item.result;
  const meta: Meta[] = [];
  const date = when(item, f, t('common.time.allDay'));
  if (date) meta.push({ key: 'when', icon: IconClock, text: date });
  if (item.kind === 'task' && r.estimateMin !== undefined) {
    meta.push({
      key: 'estimate',
      icon: IconClock,
      text: t('command.preview.estimate', { duration: f.duration(r.estimateMin) }),
    });
  }
  if (r.deadline !== undefined) {
    meta.push({
      key: 'deadline',
      icon: IconFlag,
      text: t('command.preview.deadline', { date: f.date(r.deadline) }),
    });
  }
  if (r.attendees.length > 0) {
    meta.push({
      key: 'with',
      icon: IconUser,
      text: t('command.preview.with', { people: f.list(r.attendees) }),
    });
  }
  if (r.location) meta.push({ key: 'location', icon: IconMapPin, text: r.location });
  if (r.recurrence) {
    meta.push({
      key: 'recurrence',
      icon: IconRepeat,
      text: t('command.preview.repeats', { rule: r.recurrence }),
    });
  }
  for (const tag of r.tags) meta.push({ key: `tag-${tag}`, icon: IconHash, text: tag });
  if (r.priority !== undefined && r.priority > 0) {
    meta.push({ key: 'priority', icon: IconFlag, text: t(PRIORITY_KEY[r.priority]) });
  }
  return meta;
}

function KindIcon({ item }: { item: CaptureItem }) {
  if (item.kind === 'event') return <IconCalendar size={18} />;
  const draft = item.draft;
  const inbox = draft?.collection === 'tasks' && draft.data.status === 'inbox';
  return inbox ? <IconInbox size={18} /> : <IconTasks size={18} />;
}

export function kindLabelKey(item: CaptureItem): MessageKey {
  if (item.kind === 'event') return 'command.preview.event';
  const draft = item.draft;
  return draft?.collection === 'tasks' && draft.data.status === 'inbox'
    ? 'command.preview.inbox'
    : 'command.preview.task';
}

/** One line of the preview: what Enter will create, Spark-style. */
export function PreviewRow({ item }: { item: CaptureItem }) {
  const t = useT();
  const meta = useCaptureMeta(item);
  return (
    <span className={s.preview}>
      <span className={s.previewIcon} data-kind={item.kind} aria-hidden="true">
        <KindIcon item={item} />
      </span>
      <span className={s.previewBody}>
        <span className={s.previewTitle}>
          <span className={s.previewKind}>{t(kindLabelKey(item))}</span>
          <span className={s.previewText}>{item.result.title}</span>
        </span>
        {meta.length > 0 && (
          <span className={s.previewMeta}>
            {meta.map(({ key, icon: Icon, text }) => (
              <span key={key} className={s.metaChip}>
                <Icon size={13} />
                {text}
              </span>
            ))}
          </span>
        )}
      </span>
    </span>
  );
}
