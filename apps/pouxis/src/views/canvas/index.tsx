import { useT } from '../../i18n/index.ts';

// Placeholder — implemented by the canvas view owner.
export default function CanvasView() {
  const t = useT();
  return <h1 className="serif">{t('nav.canvas')}</h1>;
}
