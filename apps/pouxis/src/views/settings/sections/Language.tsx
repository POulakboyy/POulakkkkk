import { useMemo } from 'react';
import type { Locale } from '@pouxis/core';
import { LOCALES, translate, useT } from '../../../i18n/index.ts';
import { store, usePrefs } from '../../../store/index.ts';
import { Button, SegmentedControl, toast } from '../../../ui/index.ts';
import { Group, Row, Select } from '../controls.tsx';
import s from '../Settings.module.css';

/** IANA zones known to the runtime; always includes the current one. */
export function timeZoneOptions(current: string): string[] {
  const intl = Intl as { supportedValuesOf?: (key: 'timeZone') => string[] };
  const zones = intl.supportedValuesOf?.('timeZone') ?? [];
  return zones.includes(current) ? zones : [current, ...zones];
}

/** The zone the device reports. Stored explicitly: date maths never read the machine zone. */
export function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export function LanguageSection() {
  const t = useT();
  const prefs = usePrefs();
  const zones = useMemo(() => timeZoneOptions(prefs.timeZone), [prefs.timeZone]);
  const device = deviceTimeZone();

  const setLocale = (locale: Locale) => {
    store.setPrefs({ locale });
    toast({ id: 'locale', title: translate(locale, 'settings.language.changed') });
  };

  return (
    <Group id="language" title={t('settings.sections.language')}>
      <Row label={t('settings.language.label')} wide hint={t('settings.language.hint')}>
        <SegmentedControl<Locale>
          label={t('settings.language.label')}
          value={prefs.locale}
          options={LOCALES.map((l) => ({ value: l, label: t(`settings.language.${l}`) }))}
          onChange={setLocale}
        />
      </Row>
      <Row label={t('settings.language.timeZone')} labelFor="settings-tz" stacked>
        <div className={s.inline}>
          <Select
            id="settings-tz"
            value={prefs.timeZone}
            options={zones.map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))}
            onChange={(timeZone) => store.setPrefs({ timeZone })}
          />
          {device && device !== prefs.timeZone && (
            <Button variant="ghost" size="sm" onClick={() => store.setPrefs({ timeZone: device })}>
              {t('settings.language.timeZoneAuto')}
            </Button>
          )}
        </div>
      </Row>
    </Group>
  );
}
