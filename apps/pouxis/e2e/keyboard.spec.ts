import { expect, openView, test, type ViewId } from './fixtures.ts';
import type { Locator, Page } from '@playwright/test';

/** Presses Tab until `target` has focus, failing after `max` presses. */
async function tabTo(page: Page, target: Locator, max = 60): Promise<void> {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

async function heading(page: Page, view: ViewId, name: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(`#/${view}$`));
  await expect(page.getByRole('main').getByRole('heading', { level: 1, name })).toBeVisible();
}

test.describe('keyboard only', () => {
  test.skip(({ isMobile }) => isMobile, 'Hardware keyboard journeys');

  test('the skip link is the first stop and moves focus to the content', async ({ page }) => {
    await openView(page, 'today');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Aller au contenu' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    // Hash routing owns the URL: the skip link must not navigate away.
    await expect(page).toHaveURL(/#\/today$/);
  });

  test('navigates, captures and completes a task without a pointer', async ({ page }) => {
    await openView(page, 'today');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });

    const tasksLink = nav.getByRole('link', { name: 'Tâches', exact: true });
    await tabTo(page, tasksLink);
    await page.keyboard.press('Enter');
    await heading(page, 'tasks', 'Tâches');

    await page.keyboard.press('ControlOrMeta+k');
    const bar = page.getByRole('dialog', { name: 'Barre de commande' });
    await expect(bar.getByRole('textbox')).toBeFocused();
    await page.keyboard.type('Tâche au clavier e2e #test');
    await page.keyboard.press('Enter');
    await expect(bar).toBeHidden();

    const checkbox = page.getByRole('checkbox', { name: 'Terminer « Tâche au clavier e2e »' });
    await expect(checkbox).toBeVisible();
    await tabTo(page, checkbox, 120);
    await page.keyboard.press('Space');
    await expect(page.getByRole('listitem').filter({ hasText: 'Tâche terminée' })).toBeVisible();
    await expect(checkbox).toBeHidden();
  });

  test('Escape closes the command bar and restores focus', async ({ page }) => {
    await openView(page, 'tasks');
    const capture = page.getByRole('button', { name: /^Capturer/ });
    await capture.focus();
    await page.keyboard.press('Enter');
    const bar = page.getByRole('dialog', { name: 'Barre de commande' });
    await expect(bar).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(bar).toBeHidden();
    await expect(capture).toBeFocused();
  });
});
