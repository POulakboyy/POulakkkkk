import { useRef, type ReactNode } from 'react';
import { useT, useFormat } from '../../i18n/index.ts';
import { useRecord } from '../../store/index.ts';
import {
  Button,
  IconButton,
  IconCheck,
  IconChevronDown,
  IconPause,
  IconPlay,
  IconPlus,
  Portal,
  ProgressRing,
  SegmentedControl,
  Switch,
  VisuallyHidden,
  cx,
  useFocusTrap,
  useMediaQuery,
  useHotkeys,
  useScrollLock,
} from '../../ui/index.ts';
import type { FocusController, FocusState } from './controller.ts';
import { focusDisplay } from './display.ts';
import s from './Focus.module.css';
import { usePhaseLabel } from './MiniPlayer.tsx';
import { NOISE_KINDS, noiseSupported, type NoiseKind } from './noise.ts';
import type { FocusSession } from './session.ts';

export interface FocusModeProps {
  state: FocusState & { session: FocusSession };
  controller: FocusController;
  onCollapse: () => void;
}

const EXTEND_MIN = 5;
type SoundValue = NoiseKind | 'off';

/**
 * Focus Unique (2.14): one task, full screen, huge type. Everything else is gone until the
 * session ends or the user collapses back to the mini-player.
 */
export function FocusMode({ state, controller, onCollapse }: FocusModeProps) {
  const t = useT();
  const f = useFormat();
  const ref = useRef<HTMLDivElement>(null);
  const task = useRecord('tasks', state.session.taskId);
  const d = focusDisplay(state.session, task, state.now, t('today.focus.mode'));
  const phase = usePhaseLabel()(d);
  useFocusTrap(ref, true);
  useScrollLock(true);
  useHotkeys({ escape: onCollapse });
  const short = useMediaQuery('(max-height: 760px)');
  const narrow = useMediaQuery('(max-width: 767px)');

  const soundOptions = [
    { value: 'off' as const, label: t('today.focus.soundOff') },
    ...NOISE_KINDS.map((k) => ({ value: k, label: t(`today.focus.noise.${k}`) })),
  ];
  const next = d.next
    ? t(d.next.kind === 'focus' ? 'today.focus.nextFocus' : 'today.focus.nextBreak', {
        duration: f.duration(d.next.minutes),
      })
    : undefined;
  const dndText = !state.dndWanted
    ? t('today.focus.dndOff')
    : state.dnd && !state.dnd.applied
      ? t('today.focus.dndUnavailable')
      : t('today.focus.dndOn');

  return (
    <Portal>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-mode-title"
        className={cx(s.full, 'px-vt-player', d.isBreak && s.onBreak)}
      >
        <header className={s.fullTop}>
          <IconButton
            label={t('today.focus.collapse')}
            icon={<IconChevronDown />}
            onClick={onCollapse}
          />
          <span className={s.eyebrow}>{t('today.focus.mode')}</span>
          <span className={s.topSpacer} />
        </header>

        <div className={s.stage}>
          <ProgressRing
            value={d.progress}
            label={t('today.focus.timerA11y', {
              state: phase,
              duration: f.duration(Math.ceil(d.remainingSec / 60), 'long'),
            })}
            valueText={f.timer(d.remainingSec)}
            size={short ? 196 : 248}
            thickness={6}
            tone={d.isBreak ? 'success' : 'mode'}
          >
            <span className={s.bigTimer}>{f.timer(d.remainingSec)}</span>
            <span className={s.bigPhase}>{phase}</span>
          </ProgressRing>
          {/* Phase changes (focus → break → paused) are spoken; the ticking timer is not. */}
          <VisuallyHidden aria-live="polite">{phase}</VisuallyHidden>

          <div className={s.titleBlock}>
            <span className={s.bigIcon} aria-hidden="true">
              {d.icon}
            </span>
            <h2 id="focus-mode-title" className={cx('serif', s.bigTitle)}>
              {d.title}
            </h2>
            <p className={s.sessionLine}>
              {t('today.focus.session', d.count)}
              {next && (
                <>
                  <span aria-hidden="true"> · </span>
                  {next}
                </>
              )}
            </p>
          </div>

          <div className={s.controls}>
            {d.isBreak ? (
              <Button variant="secondary" onClick={controller.skipBreak}>
                {t('today.focus.skipBreak')}
              </Button>
            ) : (
              <SideAction
                narrow={narrow}
                icon={<IconPlus size={narrow ? 22 : 16} />}
                label={t('today.focus.extend', { duration: f.duration(EXTEND_MIN) })}
                onClick={() => controller.extend(EXTEND_MIN)}
              />
            )}
            <button
              type="button"
              className={cx(s.playButton, 'px-press')}
              onClick={d.running ? controller.pause : controller.resume}
              aria-label={d.running ? t('today.focus.pause') : t('today.focus.resume')}
            >
              {d.running ? <IconPause size={32} /> : <IconPlay size={32} />}
            </button>
            <SideAction
              narrow={narrow}
              icon={<IconCheck size={narrow ? 22 : 16} />}
              label={t('today.focus.complete')}
              onClick={controller.complete}
            />
          </div>
        </div>

        <footer className={s.fullBottom}>
          {noiseSupported() && (
            <div className={s.sound}>
              <SegmentedControl<SoundValue>
                label={t('today.focus.sound')}
                options={soundOptions}
                value={state.sound ?? 'off'}
                onChange={(v) => controller.setSound(v === 'off' ? null : v)}
                size="sm"
              />
              <span className={s.hint}>{t('today.focus.soundHint')}</span>
            </div>
          )}
          <Switch
            label={t('today.focus.dnd')}
            description={dndText}
            checked={state.dndWanted}
            onCheckedChange={controller.setDnd}
          />
          <Button variant="ghost" onClick={controller.stop}>
            {t('today.focus.stop')}
          </Button>
        </footer>
      </div>
    </Portal>
  );
}

/** Secondary control beside play: a labelled pill, or a round icon button on phones. */
function SideAction(props: {
  narrow: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return props.narrow ? (
    <IconButton
      variant="secondary"
      size="lg"
      label={props.label}
      icon={props.icon}
      onClick={props.onClick}
    />
  ) : (
    <Button variant="secondary" iconStart={props.icon} onClick={props.onClick}>
      {props.label}
    </Button>
  );
}
