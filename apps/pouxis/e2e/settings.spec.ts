import { expect, expectView, openView, test } from './fixtures.ts';

test.describe('settings', () => {
  test('switches the language FR → EN → FR', async ({ page }) => {
    await openView(page, 'settings');
    const language = page.getByRole('region', { name: 'Langue et région' });
    await language.getByRole('radio', { name: 'English' }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(
      page.getByRole('main').getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', {
        name: 'Today',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page).toHaveTitle('Settings · POuxis');

    // The choice survives a reload (stored with the user preferences).
    await page.reload();
    const english = page.getByRole('region', { name: 'Language & region' });
    await expect(english.getByRole('radio', { name: 'English' })).toBeChecked();

    await english.getByRole('radio', { name: 'Français' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expectView(page, 'settings');
  });

  test('applies the dark theme and keeps it after reload', async ({ page }) => {
    await openView(page, 'settings');
    const theme = page.getByRole('radiogroup', { name: 'Thème' });
    await theme.getByRole('radio', { name: 'Sombre' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(theme.getByRole('radio', { name: 'Sombre' })).toBeChecked();

    await theme.getByRole('radio', { name: 'Comme le système' }).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  });

  test('follows the system dark scheme by default', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await openView(page, 'today');
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.emulateMedia({ colorScheme: 'light' });
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
      .not.toBe(background);
  });
});
