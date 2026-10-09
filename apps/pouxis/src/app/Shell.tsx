import { Suspense, useEffect } from 'react';
import { CommandBar, openCommandBar } from '../features/command/index.tsx';
import { FocusMiniPlayer } from '../features/focus/index.tsx';
import { useT } from '../i18n/index.ts';
import { IconPlus } from '../ui/icons.tsx';
import { navigate, useRoute } from './router.ts';
import { VIEWS } from './routes.ts';
import s from './Shell.module.css';

/**
 * App frame: a quiet sidebar on wide screens (Claude-like), a bottom tab bar with a central
 * capture button on phones (Instagram / Apple Music). The content area owns the rest.
 */
export function Shell() {
  const t = useT();
  const { view } = useRoute();
  const active = VIEWS.find((v) => v.id === view) ?? VIEWS[0]!;
  const View = active.component;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCommandBar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={s.shell}>
      <a className={s.skip} href="#main">
        {t('nav.mainNavigation')}
      </a>

      <nav className={s.sidebar} aria-label={t('nav.mainNavigation')}>
        <div className={s.brand}>
          <span className={s.logo} aria-hidden="true" />
          <span className={s.brandName}>{t('common.appName')}</span>
        </div>
        <button type="button" className={s.capture} onClick={openCommandBar}>
          <IconPlus size={18} />
          <span>{t('nav.capture')}</span>
          <kbd className={s.kbd}>⌘K</kbd>
        </button>
        <ul role="list" className={s.navList}>
          {VIEWS.map((v) => (
            <li key={v.id}>
              <a
                href={`#/${v.id}`}
                className={s.navItem}
                aria-current={v.id === view ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(v.id);
                }}
              >
                <v.icon size={20} />
                <span>{t(v.label)}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <main id="main" className={s.main} tabIndex={-1}>
        <Suspense
          fallback={
            <div className={s.loading} aria-busy="true">
              {t('common.loading')}
            </div>
          }
        >
          <View />
        </Suspense>
      </main>

      <FocusMiniPlayer />

      <nav className={s.tabbar} aria-label={t('nav.mainNavigation')}>
        {VIEWS.filter((v) => v.mobileTab).map((v, i) => (
          <TabItem
            key={v.id}
            index={i}
            id={v.id}
            active={v.id === view}
            label={t(v.label)}
            Icon={v.icon}
          />
        ))}
      </nav>

      <CommandBar />
    </div>
  );
}

function TabItem({
  id,
  active,
  label,
  Icon,
  index,
}: {
  id: (typeof VIEWS)[number]['id'];
  active: boolean;
  label: string;
  Icon: (typeof VIEWS)[number]['icon'];
  index: number;
}) {
  const t = useT();
  return (
    <>
      {index === 2 && (
        <button
          type="button"
          className={s.tabCapture}
          onClick={openCommandBar}
          aria-label={t('nav.capture')}
        >
          <IconPlus size={24} />
        </button>
      )}
      <a
        href={`#/${id}`}
        className={s.tab}
        aria-current={active ? 'page' : undefined}
        onClick={(e) => {
          e.preventDefault();
          navigate(id);
        }}
      >
        <Icon size={24} />
        <span className={s.tabLabel}>{label}</span>
      </a>
    </>
  );
}
