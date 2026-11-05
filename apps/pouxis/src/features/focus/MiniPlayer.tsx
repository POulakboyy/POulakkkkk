import { useT, useFormat } from '../../i18n/index.ts';
import { useRecord } from '../../store/index.ts';
import { IconButton, IconPause, IconPlay, ProgressRing, cx } from '../../ui/index.ts';
import type { FocusController, FocusState } from './controller.ts';
import { focusDisplay, type FocusDisplay } from './display.ts';
import s from './Focus.module.css';
import type { FocusSession } from './session.ts';

export interface MiniPlayerProps {
  state: FocusState & { session: FocusSession };
  controller: FocusController;
  onExpand: () => void;
}

/** Spoken and visible state line, shared with the full player. */
export function usePhaseLabel(): (d: FocusDisplay) => string {
  const t = useT();
  return (d) => {
    if (d.phase === 'break') return t('today.focus.onBreak');
    if (d.phase === 'paused') return t('today.focus.paused');
    if (d.phase === 'ready') return t('today.focus.ready');
    return t('today.focus.focusing');
  };
}

/**
 * Apple-Music-style player docked above the tab bar (or floating at the bottom of the content
 * on wide screens): progress ring, task, time left, play/pause. Tapping it opens Focus Unique.
 */
export function MiniPlayer({ state, controller, onExpand }: MiniPlayerProps) {
  const t = useT();
  const f = useFormat();
  const task = useRecord('tasks', state.session.taskId);
  const d = focusDisplay(state.session, task, state.now, t('today.focus.mode'));
  const phase = usePhaseLabel()(d);
  const ringLabel = t('today.focus.timerA11y', {
    state: phase,
    duration: f.duration(Math.ceil(d.remainingSec / 60), 'long'),
  });

  return (
    <section
      className={cx(s.mini, 'px-vt-player', d.isBreak && s.onBreak)}
      aria-label={t('today.focus.a11y')}
    >
      <button
        type="button"
        className={s.miniOpen}
        onClick={onExpand}
        aria-label={`${t('today.focus.expand')} — ${d.title}`}
      >
        <ProgressRing
          value={d.progress}
          label={ringLabel}
          valueText={f.timer(d.remainingSec)}
          size={44}
          thickness={4}
          tone={d.isBreak ? 'success' : 'mode'}
        >
          <span className={s.miniIcon} aria-hidden="true">
            {d.icon}
          </span>
        </ProgressRing>
        <span className={s.miniText}>
          <span className={s.miniTitle}>{d.title}</span>
          <span className={s.miniMeta}>
            <span>{phase}</span>
            <span aria-hidden="true"> · </span>
            <span className={s.tabular}>{f.timer(d.remainingSec)}</span>
          </span>
        </span>
      </button>
      {d.running ? (
        <IconButton
          label={t('today.focus.pause')}
          icon={<IconPause />}
          onClick={controller.pause}
        />
      ) : (
        <IconButton
          label={t('today.focus.resume')}
          icon={<IconPlay />}
          onClick={controller.resume}
        />
      )}
    </section>
  );
}
