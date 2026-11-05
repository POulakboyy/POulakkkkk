import { useState } from 'react';
import type { WorkingHours, WorkMode } from '@pouxis/core';
import {
  CHRONOTYPE_VALUES,
  setAppPrefs,
  useAppPrefs,
  type Chronotype,
} from '../../../app/appPrefs.ts';
import { useFormat, useT } from '../../../i18n/index.ts';
import { store, usePrefs } from '../../../store/index.ts';
import { SegmentedControl } from '../../../ui/index.ts';
import { Group, Row, Select, Stepper } from '../controls.tsx';
import { HoursEditor } from '../HoursEditor.tsx';
import { hoursValid } from '../hours.ts';

const BUFFERS = [0, 5, 10, 15, 20, 30] as const;
const MAKER_BLOCKS = [60, 90, 120, 180, 240] as const;

type ChronoValue = Chronotype | 'unset';

export function WorkSection() {
  const t = useT();
  const f = useFormat();
  const prefs = usePrefs();
  const app = useAppPrefs();
  // Invalid hours stay local: the scheduler only ever sees a usable range.
  const [hours, setHours] = useState<WorkingHours>(prefs.workingHours);

  const changeHours = (next: WorkingHours) => {
    setHours(next);
    if (hoursValid(next)) store.setPrefs({ workingHours: next });
  };

  const stepperLabels = {
    decreaseLabel: t('settings.decrease'),
    increaseLabel: t('settings.increase'),
  };

  return (
    <Group id="work" title={t('settings.sections.work')}>
      <Row label={t('settings.work.hours.label')} hint={t('settings.work.hours.hint')} stacked>
        <HoursEditor
          value={hours}
          onChange={changeHours}
          labels={{
            start: t('settings.work.hours.start'),
            end: t('settings.work.hours.end'),
            days: t('settings.work.hours.days'),
            invalid: t('settings.work.hoursInvalid'),
          }}
        />
      </Row>

      <Row
        label={t('settings.work.modes.defaultMode')}
        hint={t('settings.work.modes.hint')}
        stacked
      >
        <SegmentedControl<WorkMode>
          label={t('settings.work.modes.defaultMode')}
          value={app.defaultMode}
          options={[
            { value: 'create', label: t('common.mode.create') },
            { value: 'organize', label: t('common.mode.organize') },
          ]}
          onChange={(defaultMode) => setAppPrefs({ defaultMode })}
        />
      </Row>

      <Row
        label={t('settings.work.chronotype.label')}
        hint={t('settings.work.chronotype.hint')}
        stacked
      >
        <SegmentedControl<ChronoValue>
          label={t('settings.work.chronotype.label')}
          value={app.chronotype ?? 'unset'}
          options={[
            ...CHRONOTYPE_VALUES.map((c) => ({ value: c, label: t(`onboarding.rhythm.${c}`) })),
            { value: 'unset' as const, label: t('settings.work.chronotype.unset') },
          ]}
          onChange={(v) => setAppPrefs({ chronotype: v === 'unset' ? null : v })}
        />
      </Row>

      <Row
        label={t('settings.work.buffers.label')}
        wide
        hint={t('settings.work.buffers.hint')}
        labelFor="settings-buffer"
      >
        <Select
          id="settings-buffer"
          value={prefs.bufferMin}
          options={BUFFERS.map((m) => ({
            value: m,
            label: m === 0 ? t('settings.work.buffers.off') : f.duration(m),
          }))}
          onChange={(bufferMin) => store.setPrefs({ bufferMin })}
        />
      </Row>

      <Row
        label={t('settings.work.maker.label')}
        wide
        hint={t('settings.work.maker.hint')}
        labelFor="settings-maker"
      >
        <Select
          id="settings-maker"
          value={prefs.makerBlockMin}
          options={MAKER_BLOCKS.map((m) => ({ value: m, label: f.duration(m) }))}
          onChange={(makerBlockMin) => store.setPrefs({ makerBlockMin })}
        />
      </Row>

      <Row label={t('settings.work.wip.label')} wide hint={t('settings.work.wip.hint')}>
        <Stepper
          label={t('settings.work.wip.label')}
          value={prefs.wipLimit}
          min={1}
          max={10}
          format={(count) => t('settings.work.wip.value', { count })}
          onChange={(wipLimit) => store.setPrefs({ wipLimit })}
          {...stepperLabels}
        />
      </Row>

      <Row label={t('settings.work.decay.label')} wide hint={t('settings.work.decay.hint')}>
        <Stepper
          label={t('settings.work.decay.label')}
          value={prefs.decayThreshold}
          min={1}
          max={10}
          format={(count) => t('settings.work.decay.value', { count })}
          onChange={(decayThreshold) => store.setPrefs({ decayThreshold })}
          {...stepperLabels}
        />
      </Row>
    </Group>
  );
}
