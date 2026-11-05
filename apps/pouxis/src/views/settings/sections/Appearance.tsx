import { useState } from 'react';
import { THEMES, setAppPrefs, useAppPrefs, type ThemePref } from '../../../app/appPrefs.ts';
import { useFormat, useT, type MessageKey } from '../../../i18n/index.ts';
import { Button, IconCheck, IconMapPin, Switch } from '../../../ui/index.ts';
import { Group, Row } from '../controls.tsx';
import s from '../Settings.module.css';

const THEME_HINT: Partial<Record<ThemePref, MessageKey>> = {
  daylight: 'settings.appearance.theme.daylightHint',
  eink: 'settings.appearance.theme.einkHint',
};

/**
 * Miniature of each theme: background, surface, ink. Themes are scoped to <html>, so a preview
 * of a theme that is not applied cannot read the tokens; these mirror `--bg`, `--surface` and
 * `--ink` of tokens.css (light, dark, eink). `auto` and `daylight` show light fading to dark.
 */
const LIGHT = ['#f6f4ef', '#ffffff', '#1c1b18'] as const;
const DARK = ['#121211', '#1f1e1c', '#f3f1ec'] as const;
const SWATCH: Record<ThemePref, readonly [string, string, string]> = {
  auto: [`linear-gradient(135deg, ${LIGHT[0]} 50%, ${DARK[0]} 50%)`, LIGHT[1], LIGHT[2]],
  light: LIGHT,
  dark: DARK,
  daylight: [`linear-gradient(180deg, ${LIGHT[0]}, ${DARK[0]})`, LIGHT[1], LIGHT[2]],
  eink: ['#ffffff', '#ffffff', '#000000'],
};

type LocateState = 'idle' | 'busy' | 'denied';

export function AppearanceSection() {
  const t = useT();
  const f = useFormat();
  const prefs = useAppPrefs();
  const [locate, setLocate] = useState<LocateState>('idle');

  const requestLocation = () => {
    const geo = globalThis.navigator?.geolocation;
    if (!geo) return setLocate('denied');
    setLocate('busy');
    geo.getCurrentPosition(
      (pos) => {
        // Two decimals (~1 km) is plenty for sunrise maths and keeps the position coarse.
        const round = (n: number) => Math.round(n * 100) / 100;
        setAppPrefs({
          location: {
            latitude: round(pos.coords.latitude),
            longitude: round(pos.coords.longitude),
          },
        });
        setLocate('idle');
      },
      () => setLocate('denied'),
      { maximumAge: 24 * 3_600_000, timeout: 15_000 },
    );
  };

  const hint = THEME_HINT[prefs.theme];

  return (
    <Group id="appearance" title={t('settings.sections.appearance')}>
      <Row label={t('settings.appearance.theme.label')} hint={hint && t(hint)} stacked>
        <div
          role="radiogroup"
          aria-label={t('settings.appearance.theme.label')}
          className={s.themes}
        >
          {THEMES.map((theme) => {
            const [bg, surface, ink] = SWATCH[theme];
            const checked = prefs.theme === theme;
            return (
              <button
                key={theme}
                type="button"
                role="radio"
                aria-checked={checked}
                className={s.theme}
                onClick={() => setAppPrefs({ theme })}
              >
                <span className={s.swatch} style={{ background: bg }} aria-hidden="true">
                  <span className={s.swatchCard} style={{ background: surface, color: ink }}>
                    <span className={s.swatchLine} />
                    <span className={s.swatchLine} />
                  </span>
                  {checked && (
                    <span className={s.swatchCheck}>
                      <IconCheck size={14} />
                    </span>
                  )}
                </span>
                <span className={s.themeLabel}>{t(`settings.appearance.theme.${theme}`)}</span>
              </button>
            );
          })}
        </div>
      </Row>

      {prefs.theme === 'daylight' && (
        <Row
          label={t('settings.appearance.location.label')}
          hint={
            locate === 'denied'
              ? t('settings.appearance.location.denied')
              : prefs.location
                ? t('settings.appearance.location.set', {
                    latitude: f.number(prefs.location.latitude),
                    longitude: f.number(prefs.location.longitude),
                  })
                : t('settings.appearance.location.missing')
          }
        >
          {prefs.location ? (
            <Button variant="ghost" size="sm" onClick={() => setAppPrefs({ location: null })}>
              {t('settings.appearance.location.clear')}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              iconStart={<IconMapPin size={16} />}
              loading={locate === 'busy'}
              onClick={requestLocation}
            >
              {t('settings.appearance.location.locate')}
            </Button>
          )}
        </Row>
      )}

      <Row label={t('settings.appearance.zen.label')} hint={t('settings.appearance.zen.hint')}>
        <Switch
          aria-label={t('settings.appearance.zen.label')}
          checked={prefs.zen}
          onCheckedChange={(zen) => setAppPrefs({ zen })}
        />
      </Row>
      <Row
        label={t('settings.appearance.haptics.label')}
        hint={t('settings.appearance.haptics.hint')}
      >
        <Switch
          aria-label={t('settings.appearance.haptics.label')}
          checked={prefs.haptics}
          onCheckedChange={(haptics) => setAppPrefs({ haptics })}
        />
      </Row>
    </Group>
  );
}
