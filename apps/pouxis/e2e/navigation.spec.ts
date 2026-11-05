import {
  VIEW_LABELS,
  expect,
  expectView,
  mainNav,
  openView,
  test,
  type ViewId,
} from './fixtures.ts';

const ALL_VIEWS = Object.keys(VIEW_LABELS) as ViewId[];
const TAB_VIEWS: ViewId[] = ['today', 'tasks', 'calendar', 'ideas'];
const MORE_VIEWS: ViewId[] = ['canvas', 'insights', 'settings', 'lab'];

test.describe('navigation', () => {
  test('sidebar reaches every view and marks the current one', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The sidebar is the wide-screen navigation');
    await openView(page, 'today');
    for (const view of ALL_VIEWS) {
      const link = mainNav(page).getByRole('link', { name: VIEW_LABELS[view], exact: true });
      await link.click();
      await expectView(page, view);
      await expect(link).toHaveAttribute('aria-current', 'page');
      await expect(page).toHaveURL(new RegExp(`#/${view}$`));
      await expect(page).toHaveTitle(`${VIEW_LABELS[view]} · POuxis`);
    }
  });

  test('tab bar and the More menu reach every view', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The tab bar is the phone navigation');
    await openView(page, 'today');
    const tabs = mainNav(page);
    for (const view of TAB_VIEWS) {
      await tabs.getByRole('link', { name: VIEW_LABELS[view], exact: true }).click();
      await expectView(page, view);
    }
    for (const view of MORE_VIEWS) {
      await page.getByRole('banner').getByRole('button', { name: 'Plus', exact: true }).click();
      await page.getByRole('menu', { name: 'Plus' }).getByRole('menuitem', { name: VIEW_LABELS[view] }).click();
      await expectView(page, view);
      await expect(page.getByRole('menu')).toBeHidden();
    }
  });

  test('Alt+digit shortcuts switch views', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Hardware keyboard shortcuts');
    await openView(page, 'today');
    await page.keyboard.press('Alt+3');
    await expectView(page, 'calendar');
    await page.keyboard.press('Alt+5');
    await expectView(page, 'ideas');
  });

  test('an unknown route falls back to Today', async ({ page }) => {
    await page.goto('/#/nowhere');
    await expectView(page, 'today');
  });
});

test.describe('every view renders without errors', () => {
  for (const view of ALL_VIEWS) {
    test(view, async ({ page }) => {
      // The auto `consoleErrors` fixture fails the test on any console or page error.
      await openView(page, view);
      await expect(page.getByRole('main')).not.toHaveAttribute('aria-busy', 'true');
    });
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('zeroes the motion tokens and still renders every view', async ({ page }) => {
    await openView(page, 'today');
    const duration = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--dur-base').trim(),
    );
    expect(duration).toBe('0ms');
    for (const view of ALL_VIEWS) {
      await page.goto(`/#/${view}`);
      await expectView(page, view);
    }
  });
});
