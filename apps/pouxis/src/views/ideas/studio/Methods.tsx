/**
 * Guided method cards (5.10): SCAMPER and the six thinking hats, one timed step at a time.
 * The step machine lives in `@pouxis/core` (ideation); this component only ticks the clock.
 */
import { useEffect, useState } from 'react';
import { ideation, type Locale } from '@pouxis/core';
import { useFormat, useT } from '../../../i18n/index.ts';
import { store, usePrefs } from '../../../store/index.ts';
import {
  Button,
  cx,
  IconButton,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconPause,
  IconPlay,
  IconPlus,
  ProgressRing,
  TextField,
  toast,
} from '../../../ui/index.ts';
import { ToolHeader } from './ToolHeader.tsx';
import s from './Studio.module.css';

export function Methods({ onSaved }: { onSaved: (noteId: string) => void }) {
  const t = useT();
  const { locale } = usePrefs();
  const [session, setSession] = useState<ideation.MethodSession | null>(null);

  const finish = (current: ideation.MethodSession) => {
    const done = ideation.finishSession(current, Date.now());
    setSession(null);
    if (done.notes.every((list) => list.length === 0)) {
      toast({ title: t('ideas.methods.nothing') });
      return;
    }
    const note = store.create('notes', summaryNote(done, locale));
    toast({
      title: t('ideas.methods.saved'),
      tone: 'success',
      action: { label: t('common.actions.open'), onClick: () => onSaved(note.id) },
    });
  };

  return (
    <section className={s.tool} aria-labelledby="methods-title">
      <ToolHeader
        id="methods-title"
        title={t('ideas.methods.title')}
        hint={t('ideas.methods.hint')}
      />
      {session ? (
        <MethodRunner session={session} onChange={setSession} onFinish={finish} />
      ) : (
        <ul className={s.methodList}>
          {ideation.METHODS.map((method) => (
            <li key={method.id} className={s.methodCard}>
              <p className={s.methodName}>{method.name[locale]}</p>
              <p className={s.methodSummary}>{method.summary[locale]}</p>
              <p className={s.methodMeta}>
                {t('ideas.methods.stepCount', { count: method.steps.length })}
              </p>
              <Button
                size="sm"
                variant="secondary"
                iconStart={<IconPlay />}
                onClick={() => setSession(ideation.startSession(method.id, Date.now()))}
              >
                {t('ideas.methods.start')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Note kept from a finished session: method name and date as title, ideas per step as body. */
export function summaryNote(session: ideation.MethodSession, locale: Locale) {
  const name = ideation.getMethod(session.methodId).name[locale];
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    session.finishedAt ?? session.startedAt,
  );
  const body = ideation.summarizeSession(session, locale).replace(/^# .*\n\n?/, '');
  return { title: `${name} · ${date}`, body, tags: [session.methodId], links: [] };
}

interface RunnerProps {
  session: ideation.MethodSession;
  onChange: (session: ideation.MethodSession) => void;
  onFinish: (session: ideation.MethodSession) => void;
}

function MethodRunner({ session, onChange, onFinish }: RunnerProps) {
  const t = useT();
  const format = useFormat();
  const { locale } = usePrefs();
  const [now, setNow] = useState(() => Date.now());
  const [idea, setIdea] = useState('');
  const running = session.status === 'running';

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const method = ideation.getMethod(session.methodId);
  const step = ideation.currentStep(session);
  const total = method.steps.length;
  const budget = (session.minutes[session.stepIndex] ?? step.minutes) * 60_000;
  const remaining = ideation.stepRemaining(session, now);
  const overdue = remaining < 0;
  const ideas = session.notes[session.stepIndex] ?? [];
  const last = session.stepIndex === total - 1;

  /** The session with the idea being typed, if any, added to the current step. */
  const withPending = () => {
    setIdea('');
    return ideation.addIdea(session, idea);
  };

  return (
    <div className={s.runner}>
      <div className={s.runnerHead}>
        <p className={s.runnerName}>
          {method.name[locale]}
          <span className={s.runnerStep}>
            {t('ideas.methods.step', { current: session.stepIndex + 1, total })}
          </span>
        </p>
        <IconButton
          label={t('ideas.methods.quit')}
          icon={<IconClose />}
          variant="ghost"
          size="sm"
          onClick={() => onFinish(withPending())}
        />
      </div>
      <div className={s.stepDots} aria-hidden="true">
        {method.steps.map((st, i) => (
          <span
            key={st.id}
            className={cx(
              s.stepDot,
              i < session.stepIndex && s.stepDotDone,
              i === session.stepIndex && s.stepDotOn,
            )}
          />
        ))}
      </div>

      <div key={step.id} className={s.stepCard}>
        <div className={s.stepTop}>
          <span className={cx(s.stepBadge, step.hat && s[`hat-${step.hat}`])} aria-hidden="true">
            {step.letter ?? ''}
          </span>
          <div className={s.stepText}>
            <h3 className={s.stepTitle}>{step.title[locale]}</h3>
            <p className={s.stepPrompt}>{step.prompt[locale]}</p>
          </div>
          <ProgressRing
            className={s.timer}
            size={72}
            thickness={5}
            value={overdue ? 0 : Math.max(0, remaining / Math.max(budget, 1))}
            tone={overdue ? 'create' : 'accent'}
            label={t('ideas.methods.remaining')}
            valueText={format.timer(Math.ceil(Math.abs(remaining) / 1000))}
          >
            <span className={cx(s.timerText, overdue && s.timerOver)}>
              {overdue ? '+' : ''}
              {format.timer(Math.ceil(Math.abs(remaining) / 1000))}
            </span>
          </ProgressRing>
        </div>
        <ul className={s.questions}>
          {step.questions[locale].map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
        {overdue && <p className={s.muted}>{t('ideas.methods.overdue')}</p>}

        <form
          className={s.ideaForm}
          onSubmit={(e) => {
            e.preventDefault();
            if (idea.trim()) onChange(withPending());
          }}
        >
          <TextField
            label={t('ideas.methods.ideaLabel')}
            hideLabel
            placeholder={t('ideas.methods.ideaPlaceholder')}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            wrapperClassName={s.grow}
          />
          <IconButton
            type="submit"
            label={t('ideas.methods.addIdea')}
            icon={<IconPlus />}
            variant="secondary"
          />
        </form>
        {ideas.length > 0 && (
          <ul className={s.ideaList} aria-label={t('ideas.methods.ideas', { count: ideas.length })}>
            {ideas.map((text, i) => (
              <li key={`${i}:${text}`} className={s.idea}>
                {text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={s.runnerActions}>
        <IconButton
          label={t('ideas.methods.previous')}
          icon={<IconChevronLeft />}
          variant="secondary"
          disabled={session.stepIndex === 0}
          onClick={() => onChange(ideation.previousStep(session, Date.now()))}
        />
        <IconButton
          label={running ? t('ideas.methods.pause') : t('ideas.methods.resume')}
          icon={running ? <IconPause /> : <IconPlay />}
          variant="secondary"
          onClick={() =>
            onChange(
              running
                ? ideation.pauseSession(session, Date.now())
                : ideation.resumeSession(session, Date.now()),
            )
          }
        />
        {last ? (
          <Button variant="primary" onClick={() => onFinish(withPending())}>
            {t('ideas.methods.finish')}
          </Button>
        ) : (
          <Button
            variant="primary"
            iconEnd={<IconChevronRight />}
            onClick={() => onChange(ideation.nextStep(withPending(), Date.now()))}
          >
            {t('ideas.methods.next')}
          </Button>
        )}
      </div>
    </div>
  );
}
