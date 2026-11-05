import { useId } from 'react';
import type { WorkingHours } from '@pouxis/core';
import { useFormat } from '../../i18n/index.ts';
import { Pill, PillGroup, TextField } from '../../ui/index.ts';
import { WEEK_ORDER, minutesToTime, timeToMinutes, toggleDay, weekdayName } from './hours.ts';
import s from './Settings.module.css';

export interface HoursEditorProps {
  value: WorkingHours;
  onChange: (next: WorkingHours) => void;
  labels: { start: string; end: string; days: string; invalid: string };
}

/** Start/end time fields and working-day pills, shared by onboarding and settings. */
export function HoursEditor({ value, onChange, labels }: HoursEditorProps) {
  const { locale } = useFormat();
  const errorId = useId();
  const invalid = value.end <= value.start;

  const setTime = (field: 'start' | 'end', text: string) => {
    const minutes = timeToMinutes(text);
    if (minutes !== null) onChange({ ...value, [field]: minutes });
  };

  return (
    <div className={s.hours}>
      <div className={s.hoursTimes}>
        <TextField
          type="time"
          label={labels.start}
          value={minutesToTime(value.start)}
          onChange={(e) => setTime('start', e.target.value)}
          aria-describedby={invalid ? errorId : undefined}
        />
        <TextField
          type="time"
          label={labels.end}
          value={minutesToTime(value.end)}
          onChange={(e) => setTime('end', e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
        />
      </div>
      {invalid && (
        <p id={errorId} className={s.error} role="alert">
          {labels.invalid}
        </p>
      )}
      <PillGroup label={labels.days} wrap>
        {WEEK_ORDER.map((day) => (
          <Pill
            key={day}
            selected={value.days.includes(day)}
            aria-label={weekdayName(day, locale, 'long')}
            onSelectedChange={() => onChange({ ...value, days: toggleDay(value.days, day) })}
          >
            {weekdayName(day, locale)}
          </Pill>
        ))}
      </PillGroup>
    </div>
  );
}
