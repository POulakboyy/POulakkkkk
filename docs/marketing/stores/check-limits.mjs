#!/usr/bin/env node
/**
 * Validates every store copy field in docs/marketing/stores/** against the limits and
 * metadata rules verified in LIMITS.md.
 *
 * Fields are declared in Markdown as:
 *
 *   <!-- field: play.shortDescription -->
 *   ```text
 *   …value…
 *   ```
 *
 * The locale comes from the file name (`*.fr.md` / `*.en.md`) or from an `@fr` / `@en`
 * suffix on the field id. List fields hold one item per non-empty line.
 *
 * Usage: node check-limits.mjs [--self-test] [--verbose]
 * Exit code: 0 when no error (warnings allowed), 1 otherwise. No dependencies.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

/** Per-field limits. `max`/`min` count Unicode code points (after NFC), `maxBytes` UTF-8 bytes. */
const RULES = {
  'apple.name': { min: 2, max: 30, store: 'apple' },
  'apple.subtitle': { max: 30, store: 'apple' },
  'apple.promotionalText': { max: 170, store: 'apple' },
  'apple.description': { max: 4000, store: 'apple' },
  'apple.keywords': { maxBytes: 100, store: 'apple', kind: 'appleKeywords' },
  'apple.whatsNew': { max: 4000, store: 'apple' },
  'apple.reviewNotes': { maxBytes: 4000, store: 'apple', allowPlaceholders: true },
  'play.title': { max: 30, store: 'play', kind: 'playStrict' },
  'play.shortDescription': { max: 80, store: 'play', kind: 'playStrict' },
  'play.fullDescription': { max: 4000, store: 'play' },
  'play.appAccess': { max: 4000, store: 'play', allowPlaceholders: true },
  'ms.shortTitle': { max: 50, store: 'ms' },
  'ms.shortDescription': { max: 1000, warnOver: 270, store: 'ms' },
  'ms.description': { max: 10000, store: 'ms', noUrls: true },
  'ms.whatsNew': { max: 1500, store: 'ms' },
  'ms.productFeatures': { list: true, maxItems: 20, itemMax: 200, store: 'ms' },
  'ms.screenshotCaptions': { list: true, maxItems: 10, itemMax: 200, store: 'ms' },
  'ms.trailerTitle': { max: 255, store: 'ms' },
  'ms.certificationNotes': { max: 4000, warnOnly: true, store: 'ms', allowPlaceholders: true },
  'flathub.name': { max: 19, warnOver: 15, store: 'flathub' },
  'flathub.summary': { max: 35, warnOutside: [10, 25], store: 'flathub', kind: 'flathubLine' },
  'flathub.description': { max: 4000, warnOnly: true, store: 'flathub' },
  'flathub.screenshotCaptions': { list: true, maxItems: 10, store: 'flathub', kind: 'flathubLine' },
};

/** Screenshot caption sets: 3–5 words per caption, item counts bounded by each store. */
const CAPTION_SETS = {
  'captions.ios-phone': { minItems: 8, maxItems: 10, store: 'apple' },
  'captions.ipad': { minItems: 8, maxItems: 10, store: 'apple' },
  'captions.mac': { minItems: 8, maxItems: 10, store: 'apple' },
  'captions.android-phone': { minItems: 8, maxItems: 8, store: 'play' },
  'captions.windows': { minItems: 8, maxItems: 10, store: 'ms' },
  'captions.linux': { minItems: 8, maxItems: 10, store: 'flathub' },
};

const REQUIRED = {
  'apple-ios': [
    'apple.name',
    'apple.subtitle',
    'apple.promotionalText',
    'apple.description',
    'apple.keywords',
  ],
  'apple-macos': ['apple.promotionalText', 'apple.description', 'apple.keywords'],
  'google-play': ['play.title', 'play.shortDescription', 'play.fullDescription'],
  'microsoft-store': [
    'ms.shortDescription',
    'ms.description',
    'ms.productFeatures',
    'ms.screenshotCaptions',
  ],
};

/** Unverifiable or promotional claims, forbidden everywhere (Play metadata policy, rule 6). */
const FORBIDDEN_CLAIMS = [
  /#\s?1\b/i,
  /\bn[°º]\s?1\b/i,
  /\bnum[ée]ro\s+(un|1)\b/i,
  /\bmeilleur(e|s|es)?\b/i,
  /\bbest\b/i,
  /\btop\s?\d*\b/i,
  /\bleader\b/i,
  /\bgratuit(e|s|es)?\b/i,
  /\bfree\b/i,
  /\bpromo(tion)?\b/i,
  /\bsale\b/i,
  /\bdiscount\b/i,
  /\bmillions?\b/i,
  /\b\d[\d\s.,]*\s?(utilisateurs|users|t[ée]l[ée]chargements|downloads)\b/i,
  /\b(avis|ratings?|reviews?)\s+\d/i,
  /[★☆]/,
  /\b(r[ée]volutionnaire|revolutionary)\b/i,
  /\b(scientifiquement prouv[ée]|scientifically proven|clinically)\b/i,
  /\b(TDAH|ADHD)\b/,
];

/** Calls to action that Google Play forbids and that age badly elsewhere. */
const FORBIDDEN_CTA = [
  /\bt[ée]l[ée]charge[rz]?\b/i,
  /\binstalle[rz]\b/i,
  /\bdownload now\b/i,
  /\binstall now\b/i,
  /\btry (it )?now\b/i,
  /\bessaye[rz] maintenant\b/i,
];

/** Other products' names: never used to borrow their search traffic (Apple 2.3.7). */
const COMPETITORS = [
  /\bNotion\b/,
  /\bTodoist\b/,
  /\bTiimo\b/,
  /\bStructured\b/,
  /\bThings 3\b/,
  /\bTrello\b/,
  /\bObsidian\b/,
  /\bTypora\b/,
  /\bEvernote\b/,
  /\bTickTick\b/,
  /\bPrezi\b/,
  /\bMiro\b/,
  /\bAsana\b/,
];

/** Other platforms or stores must not appear in Apple metadata (guideline 2.3.10). */
const NON_APPLE_PLATFORMS =
  /\b(Android|Windows|Linux|Google Play|Play Store|Microsoft Store|Flathub)\b/i;
const NON_PLAY_STORES = /\b(App Store|Microsoft Store)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;
const PLACEHOLDER = /\{\{[A-Z0-9_]+\}\}/;
const UNFINISHED = /\b(TODO|TBD|XXX|FIXME)\b|lorem ipsum/;

export const countChars = (value) => [...value.normalize('NFC')].length;
export const countBytes = (value) => new TextEncoder().encode(value.normalize('NFC')).length;
export const countWords = (value) => value.trim().split(/\s+/u).filter(Boolean).length;

/** Extracts `{ id, value, line }` for every field block of a Markdown document. */
export function parseFields(markdown) {
  const fields = [];
  const pattern = /<!--\s*field:\s*([\w.@-]+)\s*-->\s*\n```text\n([\s\S]*?)\n```/g;
  for (const match of markdown.matchAll(pattern)) {
    const [, id, value] = match;
    if (id === undefined || value === undefined) continue;
    const line = markdown.slice(0, match.index).split('\n').length;
    fields.push({ id, value, line });
  }
  return fields;
}

/** Splits `play.title@fr` into `{ key: 'play.title', locale: 'fr' }`. */
export function splitId(id, fileLocale) {
  const at = id.indexOf('@');
  if (at === -1) return { key: id, locale: fileLocale };
  return { key: id.slice(0, at), locale: id.slice(at + 1) };
}

export function ruleFor(key) {
  return RULES[key] ?? (CAPTION_SETS[key] ? { ...CAPTION_SETS[key], kind: 'captions' } : null);
}

/** Checks one field value; returns `{ errors, warnings, measure }`. */
export function checkField(key, value, context = {}) {
  const errors = [];
  const warnings = [];
  const rule = ruleFor(key);
  if (!rule) return { errors: [`unknown field id "${key}"`], warnings, measure: '' };

  const isList = rule.list === true || rule.kind === 'captions';
  const items = isList
    ? value
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    : [value];
  const report = rule.warnOnly ? warnings : errors;

  checkContent(value, rule, errors, warnings);
  const measure = isList
    ? checkList(items, rule, report, warnings)
    : checkScalar(value, rule, report, warnings);

  if (rule.kind === 'appleKeywords') checkAppleKeywords(value, context, errors, warnings);
  if (rule.kind === 'playStrict') checkPlayStrict(value, errors);
  if (rule.kind === 'flathubLine') {
    for (const item of items) checkFlathubLine(item, errors);
  }
  return { errors, warnings, measure };
}

function checkScalar(value, rule, report, warnings) {
  const chars = countChars(value);
  if (rule.min !== undefined && chars < rule.min) report.push(`${chars} chars < min ${rule.min}`);
  if (rule.max !== undefined && chars > rule.max) report.push(`${chars} chars > max ${rule.max}`);
  if (rule.maxBytes !== undefined) {
    const bytes = countBytes(value);
    if (bytes > rule.maxBytes) report.push(`${bytes} bytes > max ${rule.maxBytes}`);
    return `${bytes}/${rule.maxBytes} bytes`;
  }
  if (rule.warnOver !== undefined && chars > rule.warnOver) {
    warnings.push(`${chars} chars > recommended ${rule.warnOver}`);
  }
  if (rule.warnOutside) {
    const [low, high] = rule.warnOutside;
    if (chars < low || chars > high) warnings.push(`${chars} chars outside ideal ${low}–${high}`);
  }
  return `${chars}/${rule.max} chars`;
}

function checkList(items, rule, report, warnings) {
  if (rule.minItems !== undefined && items.length < rule.minItems) {
    report.push(`${items.length} items < min ${rule.minItems}`);
  }
  if (rule.maxItems !== undefined && items.length > rule.maxItems) {
    report.push(`${items.length} items > max ${rule.maxItems}`);
  }
  items.forEach((item, index) => {
    const chars = countChars(item);
    if (rule.itemMax !== undefined && chars > rule.itemMax) {
      report.push(`item ${index + 1}: ${chars} chars > max ${rule.itemMax}`);
    }
    if (rule.kind === 'captions') {
      const words = countWords(item);
      if (words < 3 || words > 5) report.push(`item ${index + 1} "${item}": ${words} words (3–5)`);
      if (/[.!]$/.test(item)) warnings.push(`item ${index + 1}: trailing punctuation`);
    }
  });
  const longest = Math.max(0, ...items.map(countChars));
  return `${items.length} items, longest ${longest} chars`;
}

function checkContent(value, rule, errors, warnings) {
  for (const pattern of FORBIDDEN_CLAIMS) {
    if (pattern.test(value)) errors.push(`forbidden claim matches ${pattern}`);
  }
  for (const pattern of FORBIDDEN_CTA) {
    if (pattern.test(value)) errors.push(`call to action matches ${pattern}`);
  }
  for (const pattern of COMPETITORS) {
    if (pattern.test(value)) errors.push(`third-party product name matches ${pattern}`);
  }
  if (EMOJI.test(value)) errors.push('contains emoji / pictograph');
  if (UNFINISHED.test(value)) errors.push('contains an unfinished marker (TODO/TBD/…)');
  if (PLACEHOLDER.test(value)) {
    (rule.allowPlaceholders ? warnings : errors).push('contains a {{PLACEHOLDER}} to replace');
  }
  if (rule.store === 'apple' && NON_APPLE_PLATFORMS.test(value)) {
    errors.push('mentions another platform or store (App Review 2.3.10)');
  }
  if (rule.store === 'play' && NON_PLAY_STORES.test(value)) {
    warnings.push('mentions another store');
  }
  if (rule.noUrls && /https?:\/\/|www\./i.test(value)) {
    errors.push('URLs are not allowed in this field');
  }
  if (/[ \t]+$/m.test(value)) warnings.push('trailing whitespace');
}

function checkAppleKeywords(value, context, errors, warnings) {
  if (/\n/.test(value)) errors.push('keywords must be a single line');
  const raw = value.split(',');
  if (raw.some((k, i) => i > 0 && k.startsWith(' '))) {
    warnings.push('space after comma wastes bytes');
  }
  const keywords = raw.map((k) => k.trim().toLocaleLowerCase());
  const seen = new Set();
  for (const keyword of keywords) {
    if (keyword.length === 0) errors.push('empty keyword');
    else if (countChars(keyword) <= 2) errors.push(`keyword "${keyword}" must exceed 2 chars`);
    if (seen.has(keyword)) errors.push(`duplicate keyword "${keyword}"`);
    seen.add(keyword);
    if (keyword.includes('pouxis')) errors.push('app name must not be repeated in keywords');
  }
  const titleWords = new Set(
    (context.titleText ?? '')
      .toLocaleLowerCase()
      .split(/[^\p{L}\p{N}-]+/u)
      .filter((w) => w.length > 2),
  );
  for (const keyword of keywords) {
    if (titleWords.has(keyword)) warnings.push(`"${keyword}" already in name/subtitle`);
  }
}

function checkPlayStrict(value, errors) {
  if (/\n/.test(value)) errors.push('line breaks are not allowed');
  if (/\b(new|nouveau|nouvelle|nouveaux)\b/i.test(value)) errors.push('"new" is not allowed here');
  if (/([!?.,])\1|\.\.\.|…|--|~~|[<>*_+]/.test(value)) {
    errors.push('repeated punctuation or special characters are not allowed');
  }
  const shouting = value.match(/\b\p{Lu}{3,}\b/gu)?.filter((w) => w !== 'POUXIS') ?? [];
  if (shouting.length > 0) errors.push(`capitalization for emphasis: ${shouting.join(', ')}`);
}

function checkFlathubLine(item, errors) {
  if (/\.$/.test(item)) errors.push(`"${item}" must not end with a full stop`);
  if (/^\d/.test(item)) errors.push(`"${item}" must not start with a number`);
}

function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

/** `listings/google-play.fr.md` → `{ base: 'google-play', locale: 'fr' }`. */
export function describeFile(path) {
  const match = /^(.+?)(?:\.(fr|en))?\.md$/.exec(basename(path));
  return { base: match?.[1] ?? basename(path), locale: match?.[2] ?? null };
}

function run({ verbose }) {
  let errorCount = 0;
  let warningCount = 0;
  let fieldCount = 0;
  const idsByBase = new Map();

  for (const path of markdownFiles(ROOT).sort()) {
    const rel = relative(ROOT, path);
    const { base, locale } = describeFile(path);
    const fields = parseFields(readFileSync(path, 'utf8'));
    if (fields.length === 0) continue;

    const titleText = fields
      .filter((f) => f.id === 'apple.name' || f.id === 'apple.subtitle')
      .map((f) => f.value)
      .join(' ');
    const ids = new Set();
    for (const field of fields) {
      fieldCount += 1;
      const { key, locale: fieldLocale } = splitId(field.id, locale);
      if (!fieldLocale) {
        errorCount += 1;
        console.log(`✗ ${rel}:${field.line} ${field.id} — no locale (file suffix or @fr/@en)`);
        continue;
      }
      if (ids.has(field.id)) {
        errorCount += 1;
        console.log(`✗ ${rel}:${field.line} ${field.id} — duplicate field`);
      }
      ids.add(field.id);
      const { errors, warnings, measure } = checkField(key, field.value, { titleText });
      errorCount += errors.length;
      warningCount += warnings.length;
      const status = errors.length > 0 ? '✗' : warnings.length > 0 ? '!' : '✓';
      if (verbose || errors.length > 0 || warnings.length > 0) {
        console.log(`${status} ${rel}:${field.line} ${field.id} (${fieldLocale}) ${measure}`);
      }
      for (const message of errors) console.log(`    error: ${message}`);
      for (const message of warnings) console.log(`    warning: ${message}`);
    }

    for (const required of REQUIRED[base] ?? []) {
      if (!ids.has(required)) {
        errorCount += 1;
        console.log(`✗ ${rel} — missing required field ${required}`);
      }
    }
    if (locale) {
      const entry = idsByBase.get(base) ?? new Map();
      entry.set(locale, ids);
      idsByBase.set(base, entry);
    }
  }

  for (const [base, locales] of idsByBase) {
    const fr = locales.get('fr');
    const en = locales.get('en');
    if (!fr || !en) {
      errorCount += 1;
      console.log(`✗ ${base} — needs both .fr.md and .en.md`);
      continue;
    }
    for (const id of new Set([...fr, ...en])) {
      if (!fr.has(id) || !en.has(id)) {
        errorCount += 1;
        console.log(`✗ ${base} — field ${id} missing in ${fr.has(id) ? 'en' : 'fr'}`);
      }
    }
  }

  console.log(
    `\n${fieldCount} fields checked — ${errorCount} error(s), ${warningCount} warning(s).`,
  );
  return errorCount === 0 ? 0 : 1;
}

function selfTest() {
  const cases = [
    ['bytes count accents twice', countBytes('tâche') === 6],
    ['chars count code points', countChars('tâche') === 5],
    ['NFD is normalised', countChars('tâche') === 5],
    ['words', countWords('  Votre journée,  d’un regard ') === 4],
    ['parse field', parseFields('<!-- field: a.b -->\n```text\nhello\n```')[0]?.value === 'hello'],
    ['split id', splitId('play.title@en', 'fr').locale === 'en'],
    ['file locale', describeFile('x/google-play.fr.md').locale === 'fr'],
    [
      'play title ok',
      checkField('play.title', 'POuxis : agenda, tâches, idées').errors.length === 0,
    ],
    ['play title too long', checkField('play.title', 'x'.repeat(31)).errors.length === 1],
    ['play caps', checkField('play.shortDescription', 'Plan your DAY').errors.length === 1],
    ['play emoji', checkField('play.shortDescription', 'Plan ✨ day').errors.length > 0],
    ['claim #1', checkField('ms.description', 'The #1 planner').errors.length > 0],
    ['cta', checkField('ms.description', 'Téléchargez POuxis').errors.length > 0],
    ['competitor', checkField('ms.description', 'Like Notion').errors.length > 0],
    ['apple platform', checkField('apple.description', 'Also on Android').errors.length > 0],
    ['keywords bytes', checkField('apple.keywords', 'é'.repeat(51)).errors.length > 0],
    ['keywords short', checkField('apple.keywords', 'ab,todo').errors.length === 1],
    ['keywords dup', checkField('apple.keywords', 'todo,Todo').errors.length === 1],
    [
      'keywords overlap',
      checkField('apple.keywords', 'focus,notes', { titleText: 'Agenda, focus' }).warnings
        .length === 1,
    ],
    ['captions words', checkField('captions.mac', 'Un deux\n'.repeat(8)).errors.length === 8],
    ['flathub period', checkField('flathub.summary', 'Plan your days.').errors.length === 1],
    [
      'placeholder',
      checkField('play.fullDescription', 'Mail {{SUPPORT_EMAIL}}').errors.length === 1,
    ],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name] of failed) console.log(`✗ self-test: ${name}`);
  console.log(`self-test: ${cases.length - failed.length}/${cases.length} passed`);
  return failed.length === 0 ? 0 : 1;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = new Set(process.argv.slice(2));
  const testCode = args.has('--self-test') ? selfTest() : 0;
  const runCode = run({ verbose: args.has('--verbose') });
  process.exit(testCode || runCode);
}
