import { Suspense, useCallback, useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { openCommandBar } from '../features/command/state.ts';
import { FocusMiniPlayer } from '../features/focus/index.tsx';
import { useT } from '../i18n/index.ts';
import { useSyncStatus } from '../store/index.ts';
import {
  IconMore,
  IconPlus,
  IconSearch,
  Kbd,
  Menu,
  Skeleton,
  Toaster,
  cx,
  type MenuItem,
} from '../ui/index.ts';
import { useAppPrefs } from './appPrefs.ts';
import { DeferredCommandBar } from './deferred.tsx';
import { prefetch, prefetchWhenIdle, shouldSaveData } from './prefetch.ts';
import { navigate, useRoute } from './router.ts';
import { VIEWS, viewDef, type ViewDef } from './routes.ts';
import { useDocumentMeta, usePlatformRouting, useShellKeymap } from './useShellEffects.ts';
import s from './Shell.module.css';

const MAX_TABS = 4;

/**
 * App frame: a quiet sidebar on wide screens (Claude-like), a glass header and a bottom tab bar
 * with a central capture button on phones (Instagram / Apple Music). Views own the content.
 */
export function Shell() {
  const t = useT();
  const { view } = useRoute();
  const prefs = useAppPrefs();
  const active = viewDef(view);
  const View = active.component;
  const mainRef = useRef<HTMLElement>(null);
  const getMain = useCallback(() => mainRef.current, []);
  // Same element while the view stays: shell re-renders (preferences, keymap) skip the view,
  // which subscribes to the route and the store on its own.
  const content = useMemo(() => <View />, [View]);

  useShellKeymap(prefs, getMain);
  useDocumentMeta(active.label);
  usePlatformRouting();
  useIdlePrefetch();

  const main = VIEWS.filter((v) => v.group === 'main');
  const secondary = VIEWS.filter((v) => v.group === 'secondary');
  const tabs = VIEWS.filter((v) => v.mobileTab).slice(0, MAX_TABS);
  const overflow = VIEWS.filter((v) => !tabs.includes(v));

  return (
    <div className={s.shell}>
      <a className={s.skip} href="#main" onClick={skipToMain}>
        {t('nav.skipToContent')}
      </a>

      <nav className={cx(s.sidebar, 'px-chrome')} aria-label={t('nav.mainNavigation')}>
        <div className={s.brand}>
          <span className={s.logo} aria-hidden="true" />
          <span className={s.brandName}>{t('common.appName')}</span>
        </div>
        <button type="button" className={s.capture} onClick={() => openCommandBar()}>
          <IconPlus size={18} />
          <span>{t('nav.capture')}</span>
          <Kbd keys="mod+k" className={s.kbd} />
        </button>
        <button type="button" className={s.searchButton} onClick={() => openCommandBar()}>
          <IconSearch size={18} />
          <span>{t('nav.search')}</span>
        </button>
        <NavList views={main} current={view} />
        <div className={s.sidebarFooter}>
          <NavList views={secondary} current={view} />
          <SyncIndicator />
        </div>
      </nav>

      <header className={cx(s.mobileHeader, 'px-chrome')}>
        <span className={s.mobileBrand}>
          <span className={s.logo} aria-hidden="true" />
          <span className={s.brandName}>{t('common.appName')}</span>
        </span>
        <div className={s.mobileActions}>
          <button
            type="button"
            className={s.headerButton}
            aria-label={t('nav.search')}
            onClick={() => openCommandBar()}
          >
            <IconSearch size={22} />
          </button>
          <Menu
            label={t('nav.more')}
            items={overflow.map((v): MenuItem => ({
              id: v.id,
              label: t(v.label),
              icon: <v.icon size={18} />,
              onSelect: () => navigate(v.id),
            }))}
            trigger={
              <button type="button" className={s.headerButton} aria-label={t('nav.more')}>
                <IconMore size={22} />
              </button>
            }
          />
        </div>
      </header>

      <main id="main" ref={mainRef} className={s.main} tabIndex={-1}>
        <Suspense fallback={<ViewFallback label={t('common.loading')} />}>{content}</Suspense>
      </main>

      <FocusMiniPlayer />

      <nav className={cx(s.tabbar, 'px-chrome')} aria-label={t('nav.mainNavigation')}>
        {tabs.map((v, i) => (
          <TabItem key={v.id} def={v} active={v.id === view} withCaptureBefore={i === 2} />
        ))}
      </nav>

      <DeferredCommandBar />
      <Toaster />
    </div>
  );
}

/**
 * After the first paint, warms every view, one per idle period, so later navigations render
 * from cache. Skipped when the user asked to save data.
 */
function useIdlePrefetch(): void {
  useEffect(() => {
    if (shouldSaveData()) return;
    return prefetchWhenIdle(VIEWS.map((v) => v.preload));
  }, []);
}

/** Hover, focus or touch on a link starts loading its view before the click lands. */
function warmProps(def: ViewDef) {
  const warm = () => void prefetch(def.preload);
  return { onPointerEnter: warm, onFocus: warm, onTouchStart: warm };
}

function skipToMain(e: MouseEvent) {
  // Hash routing owns `location.hash`: move focus without navigating.
  e.preventDefault();
  document.getElementById('main')?.focus();
}

function ViewFallback({ label }: { label: string }) {
  return (
    <div className={s.loading} aria-busy="true" aria-label={label}>
      <Skeleton shape="text" width="40%" height={36} />
      <Skeleton shape="rect" height={120} />
      <Skeleton shape="rect" height={240} />
    </div>
  );
}

function NavList({ views, current }: { views: readonly ViewDef[]; current: string }) {
  const t = useT();
  return (
    <ul role="list" className={s.navList}>
      {views.map((v) => (
        <li key={v.id}>
          <a
            href={`#/${v.id}`}
            className={s.navItem}
            aria-current={v.id === current ? 'page' : undefined}
            {...warmProps(v)}
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
  );
}

function SyncIndicator() {
  const t = useT();
  const status = useSyncStatus();
  const label = t(`common.sync.${status}`);
  return (
    <p className={s.sync} data-status={status} title={t('common.sync.a11y', { status: label })}>
      <span className={s.syncDot} aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}

function TabItem({
  def,
  active,
  withCaptureBefore,
}: {
  def: ViewDef;
  active: boolean;
  withCaptureBefore: boolean;
}) {
  const t = useT();
  return (
    <>
      {withCaptureBefore && (
        <button
          type="button"
          className={s.tabCapture}
          onClick={() => openCommandBar()}
          aria-label={t('nav.capture')}
        >
          <IconPlus size={24} />
        </button>
      )}
      <a
        href={`#/${def.id}`}
        className={s.tab}
        aria-current={active ? 'page' : undefined}
        {...warmProps(def)}
        onClick={(e) => {
          e.preventDefault();
          navigate(def.id);
        }}
      >
        <def.icon size={24} />
        <span className={s.tabLabel}>{t(def.label)}</span>
      </a>
    </>
  );
}
