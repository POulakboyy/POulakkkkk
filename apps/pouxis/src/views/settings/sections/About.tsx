import pkg from '../../../../package.json';
import { appActions } from '../../../app/actions.ts';
import { useT } from '../../../i18n/index.ts';
import { Button, IconExternal } from '../../../ui/index.ts';
import { Group, Row } from '../controls.tsx';
import s from '../Settings.module.css';

export const SOURCE_URL = 'https://github.com/POulakboyy/POulakkkkk';
export const LICENCE_URL = `${SOURCE_URL}/blob/main/LICENSE`;
export const NOTICE_URL = `${SOURCE_URL}/blob/main/NOTICE`;
export const ISSUES_URL = `${SOURCE_URL}/issues`;

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a className={s.link} href={href} target="_blank" rel="noreferrer noopener">
      {children}
      <IconExternal size={14} />
    </a>
  );
}

export function AboutSection() {
  const t = useT();
  return (
    <Group id="about" title={t('settings.sections.about')}>
      <Row
        label={t('settings.about.version', { version: pkg.version })}
        hint={`${t('settings.about.tagline')} ${t('settings.about.description')}`}
      />
      <Row label={t('settings.about.licence')} hint={t('settings.about.licenceValue')}>
        <ExternalLink href={LICENCE_URL}>{t('common.actions.open')}</ExternalLink>
      </Row>
      <Row label={t('settings.about.licences')}>
        <ExternalLink href={NOTICE_URL}>{t('common.actions.open')}</ExternalLink>
      </Row>
      <Row label={t('settings.about.source')}>
        <ExternalLink href={SOURCE_URL}>GitHub</ExternalLink>
      </Row>
      <Row label={t('settings.about.feedback')}>
        <ExternalLink href={ISSUES_URL}>{t('common.actions.open')}</ExternalLink>
      </Row>
      <Row label={t('settings.about.replay')}>
        <Button size="sm" variant="secondary" onClick={() => appActions.replayOnboarding()}>
          {t('common.actions.start')}
        </Button>
      </Row>
      <Row label={t('settings.about.gallery')}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => appActions.go('settings', { gallery: '1' })}
        >
          {t('common.actions.open')}
        </Button>
      </Row>
    </Group>
  );
}
