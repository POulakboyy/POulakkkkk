import { useT } from '../../i18n/index.ts';

// Placeholder — implemented by the tasks view owner.
export default function TasksView() {
  const t = useT();
  return <h1 className="serif">{t('nav.tasks')}</h1>;
}
