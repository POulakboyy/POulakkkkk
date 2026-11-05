import { expect, openView, test } from './fixtures.ts';

const TITLE = 'Atelier e2e';

test.describe('calendar', () => {
  test('creates an event from the dialog', async ({ page }) => {
    await openView(page, 'calendar');
    await page.getByRole('main').getByRole('button', { name: 'Nouvel événement' }).click();

    const dialog = page.getByRole('dialog', { name: 'Nouvel événement' });
    await dialog.getByRole('textbox', { name: 'Titre', exact: true }).fill(TITLE);
    await dialog.getByRole('textbox', { name: 'Jour' }).fill('2026-11-05');
    await dialog.getByRole('textbox', { name: 'Début' }).fill('15:00');
    await dialog.getByRole('textbox', { name: 'Fin' }).fill('16:00');
    await dialog.getByRole('button', { name: 'Créer l’événement' }).click();
    await expect(dialog).toBeHidden();

    await expect(
      page.getByRole('region', { name: 'Grille horaire' }).getByRole('button', {
        name: `${TITLE}, 15:00 – 16:00`,
      }),
    ).toBeVisible();
  });

  test('switches between day, week, month and spiral', async ({ page }) => {
    await openView(page, 'calendar');
    const main = page.getByRole('main');
    const display = main.getByRole('radiogroup', { name: 'Affichage' });

    await display.getByRole('radio', { name: 'Semaine' }).click();
    await expect(main.getByRole('group', { name: /^lundi 2 novembre\./ })).toBeVisible();
    await expect(main.getByRole('group', { name: /^dimanche 8 novembre\./ })).toBeVisible();

    await display.getByRole('radio', { name: 'Mois' }).click();
    const month = main.getByRole('grid', { name: 'Vue du mois' });
    await expect(month).toBeVisible();
    await expect(month.getByRole('gridcell', { name: /^jeudi 5 novembre, 4 événements/ })).toBeVisible();

    await display.getByRole('radio', { name: 'Spirale' }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Spirale du temps' })).toBeVisible();
    await expect(
      main.getByRole('button', { name: 'Point d’équipe aujourd’hui · 09:30 – 09:45' }),
    ).toBeVisible();

    await display.getByRole('radio', { name: 'Jour' }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Jeudi 5 novembre' })).toBeVisible();
    await expect(display.getByRole('radio', { name: 'Jour' })).toBeChecked();
  });
});
