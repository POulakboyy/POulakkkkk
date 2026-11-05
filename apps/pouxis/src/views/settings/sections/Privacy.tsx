import { setAppPrefs, useAppPrefs } from '../../../app/appPrefs.ts';
import { useT } from '../../../i18n/index.ts';
import { Switch } from '../../../ui/index.ts';
import { Group, Row } from '../controls.tsx';

export function PrivacySection() {
  const t = useT();
  const prefs = useAppPrefs();
  return (
    <Group id="privacy" title={t('settings.sections.privacy')}>
      <Row
        label={t('settings.privacy.telemetry.label')}
        hint={t('settings.privacy.telemetry.hint')}
      >
        <Switch
          aria-label={t('settings.privacy.telemetry.label')}
          checked={prefs.telemetry}
          onCheckedChange={(telemetry) => setAppPrefs({ telemetry })}
        />
      </Row>
      <Row
        label={t('settings.privacy.crashReports.label')}
        hint={t('settings.privacy.crashReports.hint')}
      >
        <Switch
          aria-label={t('settings.privacy.crashReports.label')}
          checked={prefs.crashReports}
          onCheckedChange={(crashReports) => setAppPrefs({ crashReports })}
        />
      </Row>
    </Group>
  );
}
