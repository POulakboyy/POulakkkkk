import { expect, expectView, test } from './fixtures.ts';

test.use({ onboarded: false });

test.describe('first launch', () => {
  test('walks through the four onboarding screens into Today', async ({ page }) => {
    await page.goto('/');
    const intro = page.getByRole('region', { name: 'Introduction à POuxis' });
    await expect(
      intro.getByRole('heading', { level: 1, name: 'Bienvenue dans POuxis' }),
    ).toBeVisible();
    await expect(intro.getByText('Étape 1 sur 4')).toBeVisible();
    await expect(intro.getByRole('radio', { name: 'Français' })).toBeChecked();

    await intro.getByRole('button', { name: 'Commencer' }).click();
    await expect(
      intro.getByRole('heading', { level: 1, name: 'Vos heures de travail' }),
    ).toBeFocused();

    await intro.getByRole('button', { name: 'Suivant' }).click();
    const rhythm = intro.getByRole('radiogroup', { name: 'À quel moment êtes-vous le plus vif ?' });
    await rhythm.getByRole('radio', { name: /Plutôt le matin/ }).click();
    await expect(rhythm.getByRole('radio', { name: /Plutôt le matin/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await intro.getByRole('button', { name: 'Suivant' }).click();
    await expect(intro.getByText('Étape 4 sur 4')).toBeVisible();
    await intro.getByRole('button', { name: 'Ouvrir ma journée' }).click();

    await expect(intro).toBeHidden();
    await expectView(page, 'today');

    // The choice is kept and the introduction does not come back.
    await page.reload();
    await expectView(page, 'today');
    await page.goto('/#/settings');
    await expect(
      page
        .getByRole('radiogroup', { name: 'Moment de la journée le plus vif' })
        .getByRole('radio', {
          name: 'Plutôt le matin',
        }),
    ).toBeChecked();
  });

  test('can be skipped from the first screen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Passer l’introduction' }).click();
    await expectView(page, 'today');
    await page.reload();
    await expectView(page, 'today');
  });

  test('switches the interface to English from the welcome screen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'English' }).click();
    await expect(page.getByRole('button', { name: 'Skip intro' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome to POuxis' })).toBeVisible();
  });

  // App bug: `<html lang>` is only synced by the Shell (useDocumentMeta), so it stays "fr"
  // while the onboarding is shown in English (WCAG 3.1.1). See the e2e report, issue "onboarding-lang".
  test.fixme('updates <html lang> when the language changes during onboarding', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
