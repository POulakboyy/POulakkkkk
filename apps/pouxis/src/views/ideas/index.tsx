import { useT } from '../../i18n/index.ts';

// Placeholder — implemented by the ideas view owner.
export default function IdeasView() {
  const t = useT();
  return <h1 className="serif">{t('nav.ideas')}</h1>;
}
