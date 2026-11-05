import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { Locale, WorkingHours } from '@pouxis/core';
import { setAppPrefs, useAppPrefs, type Chronotype } from '../../app/appPrefs.ts';
import { LOCALES, useT, type MessageKey } from '../../i18n/index.ts';
import { platform } from '../../platform/index.ts';
import { store, usePrefs } from '../../store/index.ts';
import {
  Button,
  IconBell,
  IconBolt,
  IconCheck,
  IconMic,
  IconMoon,
  IconSun,
  SegmentedControl,
  cx,
} from '../../ui/index.ts';
import { HoursEditor } from '../../views/settings/HoursEditor.tsx';
import { hoursValid } from '../../views/settings/hours.ts';
import { highlightSegments, planText } from '../command/capture.ts';
import { recognitionCtor } from '../command/voice.ts';
import {
  microphoneAvailable,
  notificationState,
  requestMicrophone,
  requestNotifications,
  type PermissionState,
} from './permissions.ts';
import s from './Onboarding.module.css';

export const STEPS = ['welcome', 'hours', 'rhythm', 'ready'] as const;
export type Step = (typeof STEPS)[number];

export interface OnboardingProps {
  onDone: () => void;
}

/** First run: four calm screens, one idea each; everything can be skipped and changed later. */
export function Onboarding({ onDone }: OnboardingProps) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [hoursOk, setHoursOk] = useState(true);
  const step = STEPS[index]!;
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    // Move screen-reader and keyboard focus to the new screen, not on first render.
    if (first.current) first.current = false;
    else heading.current?.focus();
  }, [index]);

  const next = () => (index < STEPS.length - 1 ? setIndex(index + 1) : onDone());
  const back = () => setIndex(Math.max(0, index - 1));

  return (
    <div className={s.root} role="region" aria-label={t('onboarding.a11y')}>
      <header className={s.top}>
        <span className={s.logo} aria-hidden="true" />
        <ol
          className={s.dots}
          aria-label={t('onboarding.progress', { current: index + 1, total: STEPS.length })}
        >
          {STEPS.map((id, i) => (
            <li
              key={id}
              className={s.dot}
              data-state={i === index ? 'current' : i < index ? 'done' : 'todo'}
            />
          ))}
        </ol>
        <button type="button" className={s.skip} onClick={onDone}>
          {t('onboarding.skip')}
        </button>
      </header>

      <main className={s.stage}>
        <div key={step} className={s.screen}>
          <p className={s.eyebrow}>
            {t('onboarding.progress', { current: index + 1, total: STEPS.length })}
          </p>
          {step === 'welcome' && <Welcome heading={heading} />}
          {step === 'hours' && <Hours heading={heading} onValid={setHoursOk} />}
          {step === 'rhythm' && <Rhythm heading={heading} />}
          {step === 'ready' && <Ready heading={heading} />}
        </div>
      </main>

      <footer className={s.actions}>
        {index > 0 && (
          <Button variant="ghost" size="lg" onClick={back}>
            {t('common.actions.back')}
          </Button>
        )}
        <Button
          size="lg"
          variant="primary"
          className={s.primary}
          onClick={next}
          disabled={step === 'hours' && !hoursOk}
        >
          {t(ACTION[step])}
        </Button>
      </footer>
    </div>
  );
}

const ACTION: Record<Step, MessageKey> = {
  welcome: 'onboarding.welcome.action',
  hours: 'onboarding.hours.action',
  rhythm: 'onboarding.rhythm.action',
  ready: 'onboarding.done.action',
};

interface ScreenProps {
  heading: RefObject<HTMLHeadingElement | null>;
}

function Title({ heading, title, body }: ScreenProps & { title: string; body: string }) {
  return (
    <>
      <h1 ref={heading} tabIndex={-1} className={s.title}>
        {title}
      </h1>
      <p className={s.body}>{body}</p>
    </>
  );
}

function Welcome({ heading }: ScreenProps) {
  const t = useT();
  const prefs = usePrefs();
  const example = t('onboarding.welcome.example');
  const segments = useMemo(() => {
    const plan = planText(example, {
      now: Date.now(),
      timeZone: prefs.timeZone,
      locale: prefs.locale,
      defaultMode: 'organize',
    });
    return highlightSegments(example, plan.tokens);
  }, [example, prefs.timeZone, prefs.locale]);

  return (
    <>
      <Title
        heading={heading}
        title={t('onboarding.welcome.title')}
        body={t('onboarding.welcome.body')}
      />
      <div className={s.field}>
        <SegmentedControl<Locale>
          label={t('onboarding.welcome.language')}
          value={prefs.locale}
          fullWidth
          options={LOCALES.map((l) => ({ value: l, label: t(`settings.language.${l}`) }))}
          onChange={(locale) => store.setPrefs({ locale })}
        />
      </div>
      <figure className={s.example}>
        <div className={s.exampleLine} aria-hidden="true">
          {segments.map((seg, i) =>
            seg.type ? (
              <mark key={i} className={s.token} data-type={seg.type}>
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
          <span className={s.caret} />
        </div>
        <figcaption className={s.caption}>{t('onboarding.welcome.exampleCaption')}</figcaption>
      </figure>
    </>
  );
}

function Hours({ heading, onValid }: ScreenProps & { onValid: (valid: boolean) => void }) {
  const t = useT();
  const prefs = usePrefs();
  const [draft, setDraft] = useState<WorkingHours>(prefs.workingHours);

  const change = (next: WorkingHours) => {
    setDraft(next);
    const valid = hoursValid(next);
    onValid(valid);
    if (valid) store.setPrefs({ workingHours: next });
  };

  return (
    <>
      <Title
        heading={heading}
        title={t('onboarding.hours.title')}
        body={t('onboarding.hours.body')}
      />
      <HoursEditor
        value={draft}
        onChange={change}
        labels={{
          start: t('onboarding.hours.start'),
          end: t('onboarding.hours.end'),
          days: t('onboarding.hours.days'),
          invalid: t('onboarding.hours.invalid'),
        }}
      />
    </>
  );
}

const RHYTHMS: {
  value: Chronotype | null;
  label: MessageKey;
  hint?: MessageKey;
  icon: ReactNode;
}[] = [
  {
    value: 'morning',
    label: 'onboarding.rhythm.morning',
    hint: 'onboarding.rhythm.morningHint',
    icon: <IconSun size={20} />,
  },
  {
    value: 'intermediate',
    label: 'onboarding.rhythm.intermediate',
    hint: 'onboarding.rhythm.intermediateHint',
    icon: <IconBolt size={20} />,
  },
  {
    value: 'evening',
    label: 'onboarding.rhythm.evening',
    hint: 'onboarding.rhythm.eveningHint',
    icon: <IconMoon size={20} />,
  },
  { value: null, label: 'onboarding.rhythm.unsure', icon: null },
];

function Rhythm({ heading }: ScreenProps) {
  const t = useT();
  const { chronotype } = useAppPrefs();
  return (
    <>
      <Title
        heading={heading}
        title={t('onboarding.rhythm.title')}
        body={t('onboarding.rhythm.body')}
      />
      <div role="radiogroup" aria-label={t('onboarding.rhythm.title')} className={s.choices}>
        {RHYTHMS.map((r) => {
          const checked = chronotype === r.value;
          return (
            <button
              key={r.label}
              type="button"
              role="radio"
              aria-checked={checked}
              className={cx(s.choice, r.value === null && s.choiceQuiet)}
              onClick={() => setAppPrefs({ chronotype: r.value })}
            >
              {r.icon && (
                <span className={s.choiceIcon} aria-hidden="true">
                  {r.icon}
                </span>
              )}
              <span className={s.choiceText}>
                <span className={s.choiceLabel}>{t(r.label)}</span>
                {r.hint && <span className={s.choiceHint}>{t(r.hint)}</span>}
              </span>
              <span className={s.choiceCheck} aria-hidden="true">
                {checked && <IconCheck size={16} />}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Ready({ heading }: ScreenProps) {
  const t = useT();
  const [notif, setNotif] = useState<PermissionState>(() => notificationState());
  const [mic, setMic] = useState<PermissionState>(() =>
    microphoneAvailable() && recognitionCtor() ? 'default' : 'unavailable',
  );

  return (
    <>
      <Title
        heading={heading}
        title={t('onboarding.ready.title')}
        body={t('onboarding.ready.body')}
      />
      <div className={s.primers}>
        <Primer
          icon={<IconBell size={20} />}
          title={t('onboarding.permissions.notifications.title')}
          body={t('onboarding.permissions.notifications.body')}
          allow={t('onboarding.permissions.notifications.allow')}
          state={platform.native ? 'default' : notif}
          onAllow={async () => setNotif(await requestNotifications())}
        />
        <Primer
          icon={<IconMic size={20} />}
          title={t('onboarding.permissions.microphone.title')}
          body={t('onboarding.permissions.microphone.body')}
          allow={t('onboarding.permissions.microphone.allow')}
          state={mic}
          onAllow={async () => setMic(await requestMicrophone())}
        />
      </div>
    </>
  );
}

function Primer({
  icon,
  title,
  body,
  allow,
  state,
  onAllow,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  allow: string;
  state: PermissionState;
  onAllow: () => void;
}) {
  const t = useT();
  return (
    <section className={s.primer} data-state={state}>
      <span className={s.primerIcon} aria-hidden="true">
        {icon}
      </span>
      <div className={s.primerText}>
        <h2 className={s.primerTitle}>{title}</h2>
        <p className={s.primerBody}>{body}</p>
        <div className={s.primerAction} aria-live="polite">
          {state === 'default' && (
            <Button size="sm" variant="secondary" onClick={onAllow}>
              {allow}
            </Button>
          )}
          {state === 'granted' && (
            <span className={s.granted}>
              <IconCheck size={16} /> {t('onboarding.permissions.granted')}
            </span>
          )}
          {state === 'denied' && (
            <span className={s.note}>{t('onboarding.permissions.denied')}</span>
          )}
          {state === 'unavailable' && (
            <span className={s.note}>{t('onboarding.permissions.unavailable')}</span>
          )}
        </div>
      </div>
    </section>
  );
}
