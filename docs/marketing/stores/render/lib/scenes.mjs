// App states shown in the store frames. Each scene drives the real app (demo seed, fixed clock)
// to one state through its accessible names, read from the app's own dictionaries, so the same
// recipe works in French and in English. A scene that cannot reach its state throws: a frame is
// never captured from a half-ready screen.

const main = (page) => page.getByRole('main');

async function openCommandBar(page, t) {
  const nav = page.getByRole('navigation', { name: t('nav.mainNavigation') });
  const button = nav.getByRole('button', { name: new RegExp(`^${t('nav.capture')}`) }).first();
  if (await button.isVisible().catch(() => false)) await button.click();
  else await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: t('command.a11y') });
  await dialog.waitFor({ timeout: 5000 });
  return dialog;
}

/** Types like a person (the preview reacts to input events, not to a pasted value). */
async function typeInto(locator, text) {
  await locator.click();
  await locator.pressSequentially(text, { delay: 12 });
}

async function scrollToHeading(page, name) {
  const heading = main(page).getByRole('heading', { name }).first();
  await heading.waitFor({ timeout: 8000 });
  await heading.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  // Leave a little air above the section title.
  await page.evaluate(() => {
    const scroller = document.scrollingElement;
    if (scroller) scroller.scrollTop = Math.max(0, scroller.scrollTop - 16);
  });
}

/** Sample sentence of the quick-capture frames (claims register C4). */
export const CAPTURE_SENTENCE = {
  fr: 'Réunion projet mardi 14h-16h',
  en: 'Project meeting Tuesday 2-4pm',
};

/**
 * Scene id → { route, clock, day?, bare?, element?, run?(page, ctx) }. `clock` is the Paris
 * wall-clock time of `day` (default: the demo Thursday); `bare` scenes have no main heading;
 * `element` clips the screenshot to one element; `ctx` = { t, lang }.
 */
export const SCENES = {
  today: { route: '#/today', clock: '10:20' },
  'capture-nlp': {
    route: '#/today',
    clock: '10:20',
    async run(page, { t, lang }) {
      const dialog = await openCommandBar(page, t);
      await typeInto(dialog.getByRole('textbox', { name: t('command.input') }), CAPTURE_SENTENCE[lang]);
      await dialog.getByText(t('command.preview.event')).first().waitFor({ timeout: 5000 });
    },
  },
  palette: {
    route: '#/today',
    clock: '10:20',
    async run(page, { t }) {
      await page.keyboard.press('Control+k');
      const dialog = page.getByRole('dialog', { name: t('command.a11y') });
      await dialog.waitFor({ timeout: 5000 });
      // A leading "/" switches the bar to command mode and lists every command.
      await typeInto(dialog.getByRole('textbox', { name: t('command.input') }), '/');
      await dialog.getByRole('option').nth(2).waitFor({ timeout: 5000 });
    },
  },
  overrun: {
    route: '#/today',
    // The demo's 10:00–11:30 sketching task is still open twelve minutes after its slot.
    clock: '11:42',
    async run(page, { t }) {
      const button = main(page).getByRole('button', { name: t('today.overrun.propagate') });
      await button.waitFor({ timeout: 8000 });
      await button.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    },
  },
  focus: {
    route: '#/today',
    clock: '10:20',
    async run(page, { t }) {
      await main(page).getByRole('button', { name: t.pattern('today.focus.startOn') }).first().click();
      // Seven minutes into the session, so the timer reads as running.
      await page.clock.fastForward(7 * 60_000);
      await page.waitForTimeout(400);
    },
  },
  ideas: { route: '#/ideas', clock: '10:20' },
  serendipity: {
    route: '#/ideas?tab=studio',
    clock: '10:20',
    async run(page, { t }) {
      await main(page).getByRole('button', { name: t('ideas.serendipity.action') }).click();
      await main(page).getByRole('button', { name: t('ideas.serendipity.link') }).first().waitFor({ timeout: 5000 });
    },
  },
  canvas: {
    route: '#/canvas',
    clock: '10:20',
    async run(page) {
      await main(page).getByRole('application').first().waitFor({ timeout: 8000 });
      await page.waitForTimeout(600);
    },
  },
  'capture-week': {
    route: '#/calendar',
    clock: '10:20',
    async run(page, ctx) {
      await SCENES['capture-nlp'].run(page, ctx);
    },
  },
  maker: {
    route: '#/today',
    // Tuesday of the demo week: a meeting lands in the middle of the morning's creative stretch.
    day: '2026-11-03',
    clock: '08:30',
    async run(page, { t }) {
      const title = main(page).getByText(t('today.maker.title')).first();
      await title.waitFor({ timeout: 8000 });
      await title.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    },
  },
  week: { route: '#/calendar', clock: '10:20' },
  kanban: { route: '#/tasks?view=kanban', clock: '10:20' },
  'insights-week': { route: '#/insights', clock: '17:30' },
  'insights-energy': {
    route: '#/insights',
    clock: '17:30',
    run: (page, { t }) => scrollToHeading(page, t('insights.energy.title')),
  },
  'insights-balance': {
    route: '#/insights',
    clock: '17:30',
    run: (page, { t }) => scrollToHeading(page, t('insights.balance.title')),
  },
  privacy: { route: '#/settings?section=privacy', clock: '10:20' },
  data: { route: '#/settings?section=data', clock: '10:20' },
  /** The global-shortcut capture window alone; the frame draws the desktop around it. */
  'capture-window': { route: '#/capture', clock: '10:20', bare: true, element: '#root > *' },
};

export function scene(id) {
  const s = SCENES[id];
  if (!s) throw new Error(`unknown scene "${id}"`);
  return s;
}
