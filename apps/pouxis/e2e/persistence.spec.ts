import { expect, openView, test, waitForPersisted } from './fixtures.ts';

test.describe('local-first persistence', () => {
  test('tasks, completions and events survive a reload (IndexedDB)', async ({ page }) => {
    await openView(page, 'tasks');
    const form = page.getByRole('form', { name: 'Nouvelle tâche' });
    await form.getByRole('textbox', { name: 'Nouvelle tâche' }).fill('Tâche persistante e2e');
    await form.getByRole('textbox', { name: 'Nouvelle tâche' }).press('Enter');
    const created = page.getByRole('checkbox', { name: 'Terminer « Tâche persistante e2e »' });
    await expect(created).toBeVisible();

    // 20 seeded + 1 created − 1 completed.
    await page.getByRole('checkbox', { name: 'Terminer « Trier les photos du voyage »' }).click();
    await expect(page.getByText('20 tâches ouvertes')).toBeVisible();
    await waitForPersisted(page, 'Tâche persistante e2e');

    await page.reload();
    await expect(created).toBeVisible();
    await expect(page.getByText('20 tâches ouvertes')).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Terminer « Trier les photos du voyage »' }),
    ).toBeHidden();

    // The demo week is seeded once: a second boot must not duplicate it.
    await page.goto('/#/calendar');
    await expect(
      page.getByRole('region', { name: 'Grille horaire' }).getByRole('button', {
        name: 'Revue produit, 14:00 – 15:00',
      }),
    ).toHaveCount(1);
  });
});
