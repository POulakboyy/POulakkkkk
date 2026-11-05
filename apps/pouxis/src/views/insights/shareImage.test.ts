import { describe, expect, it } from 'vitest';
import { IMAGE_HEIGHT, IMAGE_WIDTH, escapeXml, reviewImageSvg, truncate } from './shareImage.ts';

const base = {
  eyebrow: 'Semaine du 2 novembre',
  title: 'Mon point de la semaine',
  stats: [
    { label: 'Focus', value: '12 h' },
    { label: 'Terminées', value: '9' },
  ],
  winsTitle: 'Victoires',
  wins: ['Petit pas', 'Essai <terminé> & publié'],
  winsEmpty: 'Rien',
  blockersTitle: 'Blocages',
  blockers: ['réunions'],
  suggestionsTitle: 'Pistes',
  suggestions: ['Bloquer une plage de création'],
  footer: 'POuxis',
  theme: 'light' as const,
};

describe('reviewImageSvg', () => {
  it('produces a well-formed, escaped poster', () => {
    const svg = reviewImageSvg(base);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain(`width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}"`);
    expect(svg).toContain('Essai &lt;terminé&gt; &amp; publié');
    expect(svg).not.toContain('<terminé>');
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
  });

  it('accents the last (biggest) win and shows the empty line without wins', () => {
    const svg = reviewImageSvg(base);
    expect(svg.lastIndexOf('font-weight="600" fill="#1c1b18">Essai')).toBeGreaterThan(-1);
    expect(reviewImageSvg({ ...base, wins: [], blockers: [] })).toContain('>Rien<');
  });

  it('adds suggestions when there is room', () => {
    expect(reviewImageSvg(base)).toContain('>Bloquer une plage de création<');
  });

  it('switches palette with the theme', () => {
    expect(reviewImageSvg({ ...base, theme: 'dark' })).toContain('fill="#121211"');
  });
});

describe('text helpers', () => {
  it('escapes XML specials', () => {
    expect(escapeXml(`a&b<c>"d"'e'`)).toBe('a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;');
  });

  it('truncates on a word boundary', () => {
    expect(truncate('short', 10)).toBe('short');
    expect(truncate('une phrase beaucoup trop longue', 16)).toBe('une phrase…');
    expect(truncate('abcdefghijklmnop', 8)).toBe('abcdefg…');
  });
});
