import { useT } from '../../i18n/index.ts';

// Placeholder — implemented by the calendar view owner.
export default function CalendarView() {
  const t = useT();
  return <h1 className="serif">{t('nav.calendar')}</h1>;
}
