import { expect, openView, test } from './fixtures.ts';

test.describe('canvas', () => {
  test('adds a node with the node tool', async ({ page }) => {
    await openView(page, 'canvas');
    const board = page.getByRole('application', { name: /^Toile « Lancement du nouveau site »/ });
    await expect(board).toHaveAccessibleName(/12 nœuds$/);

    await page
      .getByRole('toolbar', { name: 'Outils' })
      .getByRole('button', { name: 'Nœud' })
      .click();
    const box = await board.boundingBox();
    if (!box) throw new Error('canvas has no layout box');
    // Lower-left corner of the board: clear of the seeded mind map and of the floating chrome.
    await page.mouse.click(box.x + box.width * 0.12, box.y + box.height * 0.72);

    const text = page.getByRole('textbox', { name: 'Texte du nœud' });
    await expect(text).toBeFocused();
    await text.fill('Nœud e2e');
    await text.press('Enter');

    await expect(board).toHaveAccessibleName(/13 nœuds$/);
    // The outline lists every node as text.
    await page
      .getByRole('radiogroup', { name: 'Affichage' })
      .getByRole('radio', { name: 'Plan' })
      .click();
    await expect(page.getByRole('main').getByText('Nœud e2e')).toBeVisible();
  });
});
