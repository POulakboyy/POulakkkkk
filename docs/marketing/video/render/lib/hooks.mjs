// Resolves the shotlist's `[data-demo="…"]` hooks inside the app frame.
//
// The views do not expose `data-demo` attributes yet (requested from their owners). Until they
// do, each hook has an explicit fallback written against the accessible names of the current
// build (French UI, demo seed) and verified by `render.mjs --check-hooks`. A hook that resolves
// neither way fails the render: nothing is ever guessed at run time.

const main = (f) => f.getByRole('main');

/** hook → (frame) => Locator, using roles and names of the current French build. */
export const FALLBACKS = {
  'capture-button': (f) =>
    f
      .getByRole('navigation', { name: 'Navigation principale' })
      .getByRole('button', { name: /^Capturer/ }),
  'command-input': (f) =>
    f
      .getByRole('dialog', { name: 'Barre de commande' })
      .getByRole('textbox', { name: /^Capturer, chercher/ }),
  'today-plan-button': (f) => main(f).getByRole('button', { name: 'Planifier ma journée' }),
  'today-timeline': (f) => main(f).getByRole('region', { name: 'Frise de la journée' }),
  'task-checkbox': (f) => main(f).getByRole('checkbox', { checked: false }),
  'calendar-week': (f) => main(f).getByRole('region', { name: 'Grille horaire' }),
  // Delay propagation lives in Today: the dashed block of the overrunning task, then its notice.
  'calendar-block-overrun': (f) => main(f).getByRole('heading', { name: /déborde$/ }),
  'shift-confirm': (f) => main(f).getByRole('button', { name: 'Décaler la suite' }),
  'focus-start': (f) => main(f).getByRole('button', { name: /^Se concentrer sur/ }),
  'mini-player': (f) => f.getByRole('button', { name: /^Agrandir le lecteur/ }),
  'braindump-open': (f) => main(f).getByRole('button', { name: /^Vider sa tête/ }),
  'braindump-input': (f) => f.getByRole('dialog').getByRole('textbox'),
  'serendipity-shuffle': (f) =>
    main(f).getByRole('button', { name: /^(Rapprocher deux idées|Nouvelles paires)$/ }),
  'canvas-surface': (f) => main(f).getByRole('application'),
  'canvas-node': (f) => main(f).getByRole('radio', { name: 'Toile' }),
  'insights-weekly': (f) => main(f).getByRole('region', { name: /^Semaine du/ }),
  'settings-data': (f) => main(f).getByRole('region', { name: 'Données' }),
  'settings-export': (f) => main(f).getByRole('button', { name: 'Exporter mes données' }),
};

export function hookName(selector) {
  const m = /^\[data-demo="([^"]+)"\]$/.exec(selector ?? '');
  return m ? m[1] : null;
}

/**
 * Locator for a shotlist selector: the `data-demo` element when present, otherwise the declared
 * fallback. Records which path was used in `usage` (hook → 'data-demo' | 'fallback').
 */
export async function resolveHook(frame, selector, usage = new Map()) {
  const hook = hookName(selector);
  if (!hook) throw new Error(`selector ${selector} is not a data-demo hook`);
  const direct = frame.locator(selector);
  if ((await direct.count()) > 0) {
    usage.set(hook, 'data-demo');
    return direct.first();
  }
  const fallback = FALLBACKS[hook];
  if (!fallback) throw new Error(`hook "${hook}": no data-demo element and no declared fallback`);
  const loc = fallback(frame);
  try {
    await loc.first().waitFor({ state: 'visible', timeout: 4000 });
  } catch {
    throw new Error(
      `hook "${hook}": no data-demo element and fallback not found in ${frame.url()}`,
    );
  }
  usage.set(hook, 'fallback');
  return loc.first();
}
