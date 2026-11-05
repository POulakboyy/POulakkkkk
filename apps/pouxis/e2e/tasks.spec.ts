import { expect, openCommandBar, openView, test } from './fixtures.ts';

const TITLE = 'Préparer la démo e2e';

test.describe('tasks', () => {
  test('command bar captures a task from natural language', async ({ page, isMobile }) => {
    await openView(page, 'tasks');
    const bar = await openCommandBar(page, isMobile);
    await bar
      .getByRole('textbox', { name: 'Capturer, chercher ou taper une commande' })
      .fill(`${TITLE} aujourd’hui 30 min #test`);
    const create = bar.getByRole('group', { name: 'Créer' }).getByRole('option').first();
    await expect(create).toContainText(TITLE);
    await expect(create).toContainText('test');
    await page.keyboard.press('Enter');
    await expect(bar).toBeHidden();

    const today = page.getByRole('main').getByRole('region', { name: /^Aujourd’hui/ });
    const row = today.getByRole('listitem').filter({ hasText: TITLE });
    await expect(row).toBeVisible();
    await expect(row).toContainText('#test');
    await expect(row).toContainText('30 min');

    // The parsed title keeps no date or tag words.
    await expect(row.getByRole('checkbox', { name: `Terminer « ${TITLE} »` })).toBeVisible();

    await page.goto('/#/today');
    await expect(
      page.getByRole('region', { name: 'Tâches flottantes' }).getByText(TITLE),
    ).toBeVisible();
  });

  test('inline form adds a task to the list', async ({ page }) => {
    await openView(page, 'tasks');
    const form = page.getByRole('form', { name: 'Nouvelle tâche' });
    await form.getByRole('textbox', { name: 'Nouvelle tâche' }).fill('Ranger le bureau');
    await form.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByRole('checkbox', { name: 'Terminer « Ranger le bureau »' })).toBeVisible();
  });

  test('completing a task can be undone from the toast', async ({ page }) => {
    await openView(page, 'tasks');
    const name = 'Terminer « Trier les photos du voyage »';
    await expect(page.getByText('20 tâches ouvertes')).toBeVisible();
    await page.getByRole('checkbox', { name }).click();

    const toast = page.getByRole('listitem').filter({ hasText: 'Tâche terminée' });
    await expect(toast).toBeVisible();
    await expect(page.getByText('19 tâches ouvertes')).toBeVisible();
    await expect(page.getByRole('checkbox', { name })).toBeHidden();

    await toast.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.getByRole('checkbox', { name })).not.toBeChecked();
    await expect(page.getByText('20 tâches ouvertes')).toBeVisible();
  });
});
