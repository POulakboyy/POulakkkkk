import { expect, openView, test } from './fixtures.ts';

test.describe('ideas', () => {
  test('brain dump sends one task per line to the inbox', async ({ page }) => {
    await openView(page, 'ideas');
    await page.getByRole('button', { name: /^Vider sa tête/ }).click();

    const dump = page.getByRole('dialog', { name: 'Vider sa tête' });
    const text = dump.getByRole('textbox', { name: 'Vider sa tête' });
    await expect(text).toBeFocused();
    await text.fill('Appeler le plombier\nIdée de podcast e2e');
    // With text in it, the close button sends the ideas.
    await dump.getByRole('button', { name: 'Envoyer dans la boîte de réception' }).click();
    await expect(dump).toBeHidden();
    await expect(page.getByText('2 idées envoyées dans la boîte de réception')).toBeVisible();

    await page.goto('/#/tasks');
    const inbox = page.getByRole('region', { name: /^À trier/ });
    await expect(inbox.getByRole('checkbox', { name: 'Terminer « Appeler le plombier »' })).toBeVisible();
    await expect(inbox.getByRole('checkbox', { name: 'Terminer « Idée de podcast e2e »' })).toBeVisible();
  });

  test('a new note can be written and found again', async ({ page }) => {
    await openView(page, 'ideas');
    await page.getByRole('button', { name: 'Nouvelle note' }).click();
    const title = page.getByRole('textbox', { name: 'Titre de la note' });
    await expect(title).toBeFocused();
    await title.fill('Note e2e');
    await page.getByRole('textbox', { name: 'Contenu de la note' }).fill('Écrite par la suite e2e.');
    await page.getByRole('searchbox', { name: 'Rechercher dans les notes' }).fill('Note e2e');
    await expect(page.getByRole('button', { name: /^Note e2e/ })).toBeVisible();
  });
});
