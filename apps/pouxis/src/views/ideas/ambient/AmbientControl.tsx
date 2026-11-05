/** Ambient sound control (5.13): a header button opening sound, volume and stop-timer choices. */
import { useEffect, useId, useState } from 'react';
import { useFormat, useT } from '../../../i18n/index.ts';
import { Button, cx, IconPause, IconPlay, Pill, PillGroup, Popover } from '../../../ui/index.ts';
import { ambient, useAmbient } from './engine.ts';
import { SOUNDS, TIMER_OPTIONS } from './noise.ts';
import s from './Ambient.module.css';

export function AmbientControl() {
  const t = useT();
  const state = useAmbient();

  return (
    <Popover
      label={t('ideas.ambient.title')}
      placement="bottom-end"
      trigger={
        <Button
          variant="secondary"
          className={cx(state.playing && s.triggerOn)}
          iconStart={<Bars playing={state.playing} />}
        >
          <span className={s.triggerText}>
            {state.playing
              ? t('ideas.ambient.playing', { sound: t(`ideas.ambient.sounds.${state.sound}`) })
              : t('ideas.ambient.open')}
          </span>
        </Button>
      }
    >
      <AmbientPanel />
    </Popover>
  );
}

/** Three bars that dance while sound plays (static when motion is reduced). */
function Bars({ playing }: { playing: boolean }) {
  return (
    <span className={cx(s.bars, playing && s.barsOn)} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function AmbientPanel() {
  const t = useT();
  const format = useFormat();
  const state = useAmbient();
  const volumeId = useId();
  const now = useNow(state.endsAt !== null);

  if (state.unsupported) return <p className={s.panel}>{t('ideas.ambient.unsupported')}</p>;

  return (
    <div className={s.panel}>
      <p className={s.title}>{t('ideas.ambient.title')}</p>
      <PillGroup label={t('ideas.ambient.sound')} wrap className={s.sounds}>
        {SOUNDS.map((sound) => (
          <Pill
            key={sound}
            size="sm"
            selected={state.sound === sound}
            onSelectedChange={() => ambient.select(sound)}
          >
            {t(`ideas.ambient.sounds.${sound}`)}
          </Pill>
        ))}
      </PillGroup>

      <div className={s.playRow}>
        <Button
          variant={state.playing ? 'secondary' : 'primary'}
          iconStart={state.playing ? <IconPause /> : <IconPlay />}
          onClick={() => ambient.toggle()}
        >
          {state.playing ? t('ideas.ambient.pause') : t('ideas.ambient.play')}
        </Button>
        <label className={s.volume} htmlFor={volumeId}>
          <span className={s.volumeLabel}>{t('ideas.ambient.volume')}</span>
          <input
            id={volumeId}
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(state.volume * 100)}
            aria-valuetext={format.percent(state.volume)}
            onChange={(e) => ambient.setVolume(Number(e.target.value) / 100)}
          />
        </label>
      </div>

      <p className={s.caption} aria-hidden="true">
        {t('ideas.ambient.timer')}
      </p>
      <PillGroup label={t('ideas.ambient.timer')} wrap>
        {TIMER_OPTIONS.map((min) => (
          <Pill
            key={min}
            size="sm"
            selected={state.timerMin === min}
            onSelectedChange={() => ambient.setTimer(min)}
          >
            {min === 0 ? t('ideas.ambient.noTimer') : t('ideas.ambient.minutes', { count: min })}
          </Pill>
        ))}
      </PillGroup>
      <p className={s.note}>
        {state.endsAt !== null
          ? t('ideas.ambient.endsIn', {
              time: format.timer(Math.max(0, Math.ceil((state.endsAt - now) / 1000))),
            })
          : t('ideas.ambient.synthesized')}
      </p>
    </div>
  );
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}
