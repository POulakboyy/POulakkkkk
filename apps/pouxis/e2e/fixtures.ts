import { expect, test as base, type Locator, type Page } from '@playwright/test';

/** Preference key of the client (see `src/app/appPrefs.ts`). */
const APP_PREFS_KEY = 'pouxis:app-prefs:v1';

/**
 * Thursday 5 November 2026, 07:30 in Paris: a work day whose free slots are all still ahead,
 * so "plan my day" and the seeded week give the same result on every run.
 */
export const FIXED_NOW = new Date('2026-11-05T07:30:00+01:00');

export type ViewId =
  | 'today'
  | 'tasks'
  | 'calendar'
  | 'canvas'
  | 'ideas'
  | 'insights'
  | 'settings'
  | 'lab';

/** French navigation labels (canonical locale), in sidebar order. */
export const VIEW_LABELS: Record<ViewId, string> = {
  today: 'Aujourd’hui',
  tasks: 'Tâches',
  calendar: 'Calendrier',
  canvas: 'Toile',
  ideas: 'Idées',
  insights: 'Bilan',
  settings: 'Réglages',
  lab: 'Labo',
};

/** Level-1 heading each view shows once loaded (with the seeded demo data). */
export const VIEW_HEADINGS: Record<ViewId, string | RegExp> = {
  today: /^(Bonjour|Bonsoir|Bon après-midi)/,
  tasks: 'Tâches',
  calendar: 'Novembre 2026',
  canvas: 'Lancement du nouveau site',
  ideas: 'Idées',
  insights: 'Bilan',
  settings: 'Réglages',
  lab: 'Labo',
};

interface Options {
  /** Mark the first-run introduction as done before the app boots (default: true). */
  onboarded: boolean;
}

interface Fixtures {
  /** Console errors and uncaught page errors seen during the test; asserted empty at the end. */
  consoleErrors: string[];
}

export const test = base.extend<Options & Fixtures>({
  onboarded: [true, { option: true }],

  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
      });
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      await use(errors);
      expect(errors, 'no console or page errors').toEqual([]);
    },
    { auto: true },
  ],

  page: async ({ page, onboarded }, use) => {
    await page.clock.setFixedTime(FIXED_NOW);
    if (onboarded) {
      // Only on the very first document: tests that reset preferences keep their changes.
      await page.addInitScript(
        ([key]) => {
          if (sessionStorage.getItem('e2e:init')) return;
          sessionStorage.setItem('e2e:init', '1');
          localStorage.setItem(key!, JSON.stringify({ onboarded: true }));
        },
        [APP_PREFS_KEY],
      );
    }
    await use(page);
  },
});

export { expect };

/** Opens a view by its hash route and waits for its heading. */
export async function openView(page: Page, view: ViewId): Promise<void> {
  await page.goto(`/#/${view}`);
  await expectView(page, view);
}

export async function expectView(page: Page, view: ViewId): Promise<void> {
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1, name: VIEW_HEADINGS[view] }),
  ).toBeVisible();
}

/** The visible main navigation: the sidebar on wide screens, the tab bar on phones. */
export function mainNav(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Navigation principale' });
}

/** Opens the command bar the way each form factor does: ⌘K / Ctrl+K, or the capture tab. */
export async function openCommandBar(page: Page, isMobile: boolean): Promise<Locator> {
  if (isMobile) await mainNav(page).getByRole('button', { name: 'Capturer' }).click();
  else await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog', { name: 'Barre de commande' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/**
 * Resolves once `text` is written to the IndexedDB op log or snapshot, so a reload that
 * follows cannot race the asynchronous disk write.
 */
export async function waitForPersisted(page: Page, text: string): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(async (needle) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open('pouxis');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        try {
          const names = ['oplog', 'snapshot'].filter((n) => db.objectStoreNames.contains(n));
          if (names.length === 0) return false;
          const tx = db.transaction(names, 'readonly');
          const values = await Promise.all(
            names.map(
              (n) =>
                new Promise<unknown>((resolve, reject) => {
                  const req = tx.objectStore(n).getAll();
                  req.onsuccess = () => resolve(req.result);
                  req.onerror = () => reject(req.error);
                }),
            ),
          );
          return JSON.stringify(values).includes(needle);
        } finally {
          db.close();
        }
      }, text),
    )
    .toBe(true);
}
