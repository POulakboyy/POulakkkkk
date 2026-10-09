import { useT } from '../../i18n/index.ts';

// Placeholder — implemented by the insights view owner.
export default function InsightsView() {
  const t = useT();
  return <h1 className="serif">{t('nav.insights')}</h1>;
}
