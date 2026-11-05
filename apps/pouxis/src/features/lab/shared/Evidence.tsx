import type { ComponentType } from 'react';
import { useT, type MessageKey } from '../../../i18n/index.ts';
import shared from './panel.module.css';

/** Wraps a lab feature with its research footnote (`lab.<id>.evidence`). */
export function withEvidence(id: string, Component: ComponentType): ComponentType {
  function WithEvidence() {
    const t = useT();
    return (
      <div className={shared.feature}>
        <Component />
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
