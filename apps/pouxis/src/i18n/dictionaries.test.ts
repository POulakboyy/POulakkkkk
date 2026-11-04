/**
 * Guards for the dictionaries themselves: same shape and variables in every locale, valid
 * ICU-lite syntax, and the copy rules of docs/design/UX_WRITING.md that a machine can check.
 */
import { describe, expect, it } from 'vitest';
import { en } from './en/index.ts';
import { fr } from './fr/index.ts';
import { messageVariables, parseMessage } from './message.ts';

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of leaves(value, path)) out.set(k, v);
  }
  return out;
}

const locales = { fr: leaves(fr as Tree), en: leaves(en as Tree) };
const all = Object.entries(locales).flatMap(([locale, map]) =>
  [...map].map(([key, value]) => ({ locale, key, value })),
);

/** Copy text only: variable names and ICU keywords are not prose. */
function prose(message: string): string {
  return message
    .replace(/\{\s*\w+\s*,\s*(plural|select|selectordinal)\s*,/g, '')
    .replace(/(=\d+|zero|one|two|few|many|other|\w+)\s*\{/g, '{')
    .replace(/\{\s*\w+\s*(,\s*number\s*)?\}/g, '');
}

describe('dictionary shape', () => {
  it('has the same keys in fr and en', () => {
    const frKeys = [...locales.fr.keys()].sort();
    const enKeys = [...locales.en.keys()].sort();
    expect(enKeys).toEqual(frKeys);
  });

  it('has the same namespaces registered in both index files', () => {
    expect(Object.keys(en)).toEqual(Object.keys(fr));
  });

  it('keeps backward-compatible keys', () => {
    for (const key of [
      'common.loading',
      'common.close',
      'common.undo',
      'nav.today',
      'nav.capture',
    ]) {
      expect(locales.fr.has(key), key).toBe(true);
    }
  });

  it('has no empty message', () => {
    for (const { locale, key, value } of all) expect(value.trim(), `${locale}:${key}`).not.toBe('');
  });
});

describe('message syntax', () => {
  it.each(all.map((m) => [`${m.locale}:${m.key}`, m.value]))('%s parses', (_, value) => {
    expect(() => parseMessage(value)).not.toThrow();
  });

  it('uses the same variables in fr and en', () => {
    for (const [key, frValue] of locales.fr) {
      const enValue = locales.en.get(key) ?? '';
      expect(messageVariables(enValue), key).toEqual(messageVariables(frValue));
    }
  });
});

describe('copy rules', () => {
  it('uses typographic apostrophes, quotes and ellipses', () => {
    for (const { locale, key, value } of all) {
      const text = prose(value);
      expect(text, `${locale}:${key} — use ’ not '`).not.toMatch(/'/);
      expect(text, `${locale}:${key} — use « » or “ ”`).not.toMatch(/"/);
      expect(text, `${locale}:${key} — use …`).not.toMatch(/\.\.\./);
    }
  });

  it('uses French quotes in French and English quotes in English', () => {
    for (const [key, value] of locales.fr) expect(value, key).not.toMatch(/[“”]/);
    for (const [key, value] of locales.en) expect(value, key).not.toMatch(/[«»]/);
  });

  it('addresses the user as « vous », never « tu »', () => {
    const tutoiement = /(?<!\p{L})(tu|toi|ton|ta|tes|t’)(?!\p{L})/iu;
    for (const [key, value] of locales.fr) expect(prose(value), key).not.toMatch(tutoiement);
  });

  it('avoids guilt-inducing and alarmist wording', () => {
    const frBanned = /en retard|manqué|échec|échoué|êtes-vous sûr|attention !|oups|erreur fatale/i;
    const enBanned = /overdue|you missed|you failed|are you sure|oops|fatal error|invalid input/i;
    for (const [key, value] of locales.fr) expect(value, key).not.toMatch(frBanned);
    for (const [key, value] of locales.en) expect(value, key).not.toMatch(enBanned);
  });

  it('never shouts', () => {
    for (const { locale, key, value } of all) {
      expect(value, `${locale}:${key}`).not.toMatch(/!!|\?\?/);
    }
  });
});
