import type { ComponentType } from 'react';
import { useT, type MessageKey } from '../../../i18n/index.ts';
import { Switch } from '../../../ui/index.ts';
import shared from './panel.module.css';
import { useFeatureEnabled } from './toggles.ts';

/**
 * Wraps a lab feature with its on/off switch and research footnote (`lab.<id>.evidence`).
 * A switched-off feature is not mounted, so it reads nothing and runs no timer.
 */
export function withEvidence(id: string, Component: ComponentType): ComponentType {
  function WithEvidence() {
    const t = useT();
    const [enabled, setEnabled] = useFeatureEnabled(id);
    const title = t(`lab.${id}.title` as MessageKey);
    return (
      <div className={shared.feature}>
        <Switch
          className={shared.toggle}
          label={t('lab.toggle')}
          aria-label={t('lab.toggleLabel', { title })}
          checked={enabled}
          onCheckedChange={setEnabled}
        />
        {enabled ? <Component /> : <p className={shared.muted}>{t('lab.paused')}</p>}
        <p className={shared.evidence}>
          <span className={shared.evidenceLabel}>{t('lab.evidence')}</span>
          {t(`lab.${id}.evidence` as MessageKey)}
        </p>
      </div>
    );
  }
  WithEvidence.displayName = `LabFeature(${id})`;
  return WithEvidence;
}
