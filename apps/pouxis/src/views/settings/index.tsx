import { useT } from '../../i18n/index.ts';

// Placeholder — implemented by the settings view owner.
export default function SettingsView() {
  const t = useT();
  return <h1 className="serif">{t('nav.settings')}</h1>;
}
