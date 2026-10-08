import { useT } from '../../i18n/index.ts';

// Placeholder — implemented by the today view owner.
export default function TodayView() {
  const t = useT();
  return <h1 className="serif">{t('nav.today')}</h1>;
}
