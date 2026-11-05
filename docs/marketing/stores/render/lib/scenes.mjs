// App states shown in the store frames. Each scene drives the real app (demo seed, fixed clock)
// to one state through its accessible names, read from the app's own dictionaries, so the same
// recipe works in French and in English. A scene that cannot reach its state throws: a frame is
// never captured from a half-ready screen.

const main = (page) => page.getByRole('main');

async function openCommandBar(page, t, mod) {
  const nav = page.getByRole('navigation', { name: t('nav.mainNavigation') });
  const button = nav.getByRole('button', { name: new RegExp(`^${t('nav.capture')}`) }).first();
  if (await button.isVisible().catch(() => false)) await button.click();
  else await page.keyboard.press(`${mod}+k`);
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
  // "Tuesday 2-4pm" is read as a date ("Tuesday 2") by the English parser: reported to core/nlp.
  en: 'Project meeting Tuesday 2pm-4pm',
};

/**
 * Scene id → { route, clock, day?, bare?, viewport?, run?(page, ctx) }. `clock` is the Paris
 * wall-clock time of `day` (default: the demo Thursday); `bare` scenes have no main heading;
 * `viewport` replaces the device's (a small floating window); `ctx` = { t, lang, mod } where `mod` is the platform's
 * shortcut modifier ('Meta' with a Mac user agent).
 */
export const SCENES = {
  today: { route: '#/today', clock: '10:20' },
  'capture-nlp': {
    route: '#/today',
    clock: '10:20',
    async run(page, { t, lang, mod }) {
      const dialog = await openCommandBar(page, t, mod);
      await typeInto(
        dialog.getByRole('textbox', { name: t('command.input') }),
        CAPTURE_SENTENCE[lang],
      );
      await dialog.getByText(t('command.preview.event')).first().waitFor({ timeout: 5000 });
    },
  },
  palette: {
    route: '#/today',
    clock: '10:20',
    async run(page, { t, mod }) {
      await page.keyboard.press(`${mod}+k`);
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
      await main(page)
        .getByRole('button', { name: t.pattern('today.focus.startOn') })
        .first()
        .click();
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
      await main(page)
        .getByRole('button', { name: t('ideas.serendipity.action') })
        .click();
      await main(page)
        .getByRole('button', { name: t('ideas.serendipity.link') })
        .first()
        .waitFor({ timeout: 5000 });
    },
  },
  canvas: {
    route: '#/canvas',
    clock: '10:20',
    async run(page, { t }) {
      const surface = main(page).getByRole('application').first();
      await surface.waitFor({ timeout: 8000 });
      // Wide screens frame the whole map; phones keep the default zoom, where labels stay legible.
      const fit = main(page)
        .getByRole('button', { name: t('canvas.view.fit') })
        .first();
      if (await fit.isVisible().catch(() => false)) await fit.click();
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
  'capture-window': {
    route: '#/capture',
    clock: '10:20',
    bare: true,
    viewport: { width: 720, height: 128 },
    async run(page, { lang }) {
      await typeInto(page.getByRole('textbox').first(), CAPTURE_SENTENCE[lang]);
      await page.waitForTimeout(300);
    },
  },
};

export function scene(id) {
  const s = SCENES[id];
  if (!s) throw new Error(`unknown scene "${id}"`);
  return s;
}

/** What each frame shows, for the stores' alternative text (after the caption). */
const ALT = {
  today: {
    fr: 'Vue Aujourd’hui : la frise de la journée, les tâches planifiées entre les rendez-vous et les tâches flottantes.',
    en: 'Today view: the day’s timeline, tasks planned between appointments, and floating tasks.',
  },
  'capture-nlp': {
    fr: 'Barre de capture : la phrase « Réunion projet mardi 14h-16h » reconnue comme un événement daté.',
    en: 'Capture bar: the sentence “Project meeting Tuesday 2-4pm” recognised as a dated event.',
  },
  'capture-week': {
    fr: 'Barre de capture au-dessus de la semaine : une phrase reconnue comme un événement daté.',
    en: 'Capture bar over the week: a sentence recognised as a dated event.',
  },
  palette: {
    fr: 'Barre de commande en mode commandes : navigation, focus, thème et export au clavier.',
    en: 'Command bar in command mode: navigation, focus, theme and export from the keyboard.',
  },
  overrun: {
    fr: 'Vue Aujourd’hui : une tâche déborde, la suite est proposée plus tard, les rendez-vous fixes restent en place.',
    en: 'Today view: a task runs over, what follows is offered later, fixed appointments stay put.',
  },
  focus: {
    fr: 'Mode Focus : une seule tâche en grand et le minuteur en cours.',
    en: 'Focus mode: one task, large, with the timer running.',
  },
  ideas: {
    fr: 'Idées : la liste des notes, la recherche et le bouton « Vider sa tête ».',
    en: 'Ideas: the note list, search and the brain-dump button.',
  },
  serendipity: {
    fr: 'Atelier : deux notes sans lien rapprochées par la rencontre fortuite.',
    en: 'Studio: two unrelated notes brought together by the chance encounter.',
  },
  canvas: {
    fr: 'Toile : la carte du projet « Lancement du nouveau site », reliée aux tâches et aux notes.',
    en: 'Canvas: the “New website launch” project map, linked to tasks and notes.',
  },
  maker: {
    fr: 'Vue Aujourd’hui : alerte avant qu’une réunion coupe une plage de création, avec un autre horaire proposé.',
    en: 'Today view: a warning before a meeting splits a creative block, with another time suggested.',
  },
  week: {
    fr: 'Calendrier : la semaine, ses réunions, ses blocs de création et un temps tampon.',
    en: 'Calendar: the week, its meetings, creative blocks and a buffer.',
  },
  kanban: {
    fr: 'Tâches en tableau : colonnes À trier, À faire et En cours.',
    en: 'Tasks as a board: To sort, To do and In progress columns.',
  },
  'insights-week': {
    fr: 'Bilan : le point de la semaine, temps de focus, tâches terminées et victoires.',
    en: 'Insights: the weekly review, focus time, completed tasks and wins.',
  },
  'insights-energy': {
    fr: 'Bilan : la carte de chaleur des heures d’énergie sur la semaine.',
    en: 'Insights: the heat map of energy hours across the week.',
  },
  'insights-balance': {
    fr: 'Bilan : la part du temps consacrée à créer et à organiser.',
    en: 'Insights: the share of time spent creating and organising.',
  },
  privacy: {
    fr: 'Réglages de confidentialité : statistiques calculées et gardées sur l’appareil.',
    en: 'Privacy settings: statistics computed and kept on the device.',
  },
  data: {
    fr: 'Réglages des données : export complet en JSON lisible, import et suppression.',
    en: 'Data settings: full export as readable JSON, import and deletion.',
  },
  'capture-window': {
    fr: 'Fenêtre de capture ouverte par le raccourci global au-dessus d’un autre document.',
    en: 'Capture window opened by the global shortcut over another document.',
  },
};

/** Alternative-text description of a scene in `lang`. */
export function sceneAlt(id, lang) {
  const alt = ALT[id]?.[lang];
  if (!alt) throw new Error(`scene "${id}": no ${lang} alternative text`);
  return alt;
}
