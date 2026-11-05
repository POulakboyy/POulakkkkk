import { expect, openView, test } from './fixtures.ts';

test.describe('today', () => {
  test('plan my day places floating tasks and can be undone', async ({ page }) => {
    await openView(page, 'today');
    const tray = page.getByRole('region', { name: 'Tâches flottantes' });
    const timeline = page.getByRole('list', { name: 'Frise de la journée' });
    const task = 'Répondre aux retours clients';
    await expect(tray.getByText(task)).toBeVisible();

    await page.getByRole('button', { name: 'Planifier ma journée' }).click();

    const summary = page.getByRole('listitem').filter({ hasText: 'Journée planifiée' });
    await expect(summary).toContainText(/\d+ tâches? placées?/);
    await expect(timeline.getByRole('checkbox', { name: new RegExp(`^${task}, de `) })).toBeVisible();
    await expect(tray.getByText(task)).toBeHidden();

    await summary.getByRole('button', { name: 'Annuler' }).click();
    await expect(tray.getByText(task)).toBeVisible();
    await expect(timeline.getByRole('checkbox', { name: new RegExp(`^${task}, de `) })).toBeHidden();
  });

  test('focus player starts, collapses with Escape and expands again', async ({ page }) => {
    await openView(page, 'today');
    const task = 'Répondre aux retours clients';
    await page.getByRole('button', { name: `Se concentrer sur « ${task} »` }).click();

    const player = page.getByRole('dialog', { name: task });
    await expect(player).toBeVisible();
    await expect(player.getByRole('progressbar', { name: /^Focus, il reste 25 minutes/ })).toBeVisible();
    await expect(player.getByRole('button', { name: 'Mettre en pause' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(player).toBeHidden();
    const mini = page.getByRole('region', { name: 'Lecteur de focus' });
    const expand = mini.getByRole('button', { name: `Agrandir le lecteur — ${task}` });
    await expect(expand).toBeVisible();

    await expand.click();
    await expect(player).toBeVisible();
    await player.getByRole('button', { name: 'Réduire le lecteur' }).click();
    await expect(player).toBeHidden();
    await expect(mini).toBeVisible();
  });
});
