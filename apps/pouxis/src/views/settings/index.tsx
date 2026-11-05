import { useEffect, useState, type MouseEvent } from 'react';
import { navigate, useRoute } from '../../app/router.ts';
import { useT, type MessageKey } from '../../i18n/index.ts';
import { Button, Gallery, IconChevronLeft, SectionHeader } from '../../ui/index.ts';
import { AboutSection } from './sections/About.tsx';
import { AppearanceSection } from './sections/Appearance.tsx';
import { DataSection } from './sections/Data.tsx';
import { KeyboardSection } from './sections/Keyboard.tsx';
import { LanguageSection } from './sections/Language.tsx';
import { PrivacySection } from './sections/Privacy.tsx';
import { SyncSection } from './sections/Sync.tsx';
import { WorkSection } from './sections/Work.tsx';
import s from './Settings.module.css';

export const SECTIONS = [
  'appearance',
  'work',
  'language',
  'keyboard',
  'sync',
  'privacy',
  'data',
  'about',
] as const;
export type SettingsSection = (typeof SECTIONS)[number];

const TITLE: Record<SettingsSection, MessageKey> = {
  appearance: 'settings.sections.appearance',
  work: 'settings.sections.work',
  language: 'settings.sections.language',
  keyboard: 'settings.sections.keyboard',
  sync: 'settings.sections.sync',
  privacy: 'settings.sections.privacy',
  data: 'settings.sections.data',
  about: 'settings.sections.about',
};

function focusSection(id: string): void {
  const heading = document.getElementById(`settings-${id}-title`);
  if (!heading) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  heading.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  heading.focus({ preventScroll: true });
}

/**
 * Section currently being read, for `aria-current` in the side navigation: the last section
 * whose top has passed the upper third of the viewport.
 */
function useActiveSection(enabled: boolean): SettingsSection {
  const [active, setActive] = useState<SettingsSection>(SECTIONS[0]);
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver !== 'function') return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = SECTIONS.find((id) => visible.has(`settings-${id}`));
        if (first) setActive(first);
      },
      { rootMargin: '0px 0px -66% 0px' },
    );
    for (const id of SECTIONS) {
      const el = document.getElementById(`settings-${id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [enabled]);
  return active;
}

/** `#/settings` — every option on one scrollable page, `?section=` jumps to one group. */
export default function SettingsView() {
  const t = useT();
  const { params } = useRoute();
  const section = params.get('section');
  const gallery = params.get('gallery') === '1';
  const active = useActiveSection(!gallery);

  useEffect(() => {
    if (section && (SECTIONS as readonly string[]).includes(section)) focusSection(section);
  }, [section]);

  if (gallery) {
    return (
      <div className={s.gallery}>
        <Button
          variant="ghost"
          size="sm"
          iconStart={<IconChevronLeft size={16} />}
          onClick={() => navigate('settings')}
        >
          {t('settings.backToSettings')}
        </Button>
        <Gallery withToaster={false} />
      </div>
    );
  }

  const jump = (e: MouseEvent, id: SettingsSection) => {
    e.preventDefault();
    focusSection(id);
  };

  return (
    <div className={s.view}>
      <SectionHeader level={1} size="display" title={t('settings.title')} />
      <div className={s.layout}>
        <nav className={s.nav} aria-label={t('settings.nav.a11y')}>
          <ul role="list">
            {SECTIONS.map((id) => (
              <li key={id}>
                <a
                  href={`#/settings?section=${id}`}
                  aria-current={id === active ? 'location' : undefined}
                  onClick={(e) => jump(e, id)}
                >
                  {t(TITLE[id])}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className={s.sections}>
          <AppearanceSection />
          <WorkSection />
          <LanguageSection />
          <KeyboardSection />
          <SyncSection />
          <PrivacySection />
          <DataSection />
          <AboutSection />
        </div>
      </div>
    </div>
  );
}
