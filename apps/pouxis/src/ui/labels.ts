import { useT } from '../i18n/index.ts';

/**
 * Default accessible labels used by the primitives, resolved from i18n. Every component also
 * accepts an explicit label prop, which wins. Single place to update if keys move.
 */
export function useUiLabels() {
  const t = useT();
  return {
    close: t('common.close'),
    loading: t('common.loading'),
    more: t('common.actions.more'),
    dismiss: t('common.actions.dismiss'),
    clear: t('common.actions.clear'),
  };
}
