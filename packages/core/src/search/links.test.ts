import { describe, expect, it } from 'vitest';
import {
  backlinks,
  createLinkResolver,
  extractWikiLinks,
  linkGraph,
  outgoingLinks,
  type LinkSource,
} from './links.ts';

describe('extractWikiLinks', () => {
  it('parses targets, headings, aliases and embeds with offsets', () => {
    const text = 'See [[Projet X#Plan|le plan]] and ![[photo.png]] and [[n_1]].';
    const links = extractWikiLinks(text);
    expect(links).toHaveLength(3);
    expect(links[0]).toMatchObject({
      target: 'Projet X',
      heading: 'Plan',
      alias: 'le plan',
      embed: false,
    });
    expect(text.slice(links[0]!.start, links[0]!.end)).toBe('[[Projet X#Plan|le plan]]');
    expect(links[1]).toMatchObject({ target: 'photo.png', embed: true });
    expect(text.slice(links[1]!.start, links[1]!.end)).toBe('![[photo.png]]');
    expect(links[2]!.target).toBe('n_1');
  });

  it('ignores same-record headings, empty and multi-line links', () => {
    expect(extractWikiLinks('[[#Intro]] [[ ]] [[a\nb]] plain')).toEqual([]);
    expect(extractWikiLinks('no links')).toEqual([]);
  });

  it('ignores links inside fenced and inline code', () => {
    const text = [
      'Real [[A]]',
      '```md',
      'Example [[B]]',
      '```',
      'Inline `[[C]]` and ``x [[D]] y`` then [[E]]',
      '~~~',
      '[[F]] unterminated fence',
    ].join('\n');
    expect(extractWikiLinks(text).map((l) => l.target)).toEqual(['A', 'E']);
  });
});

describe('resolver and outgoing links', () => {
  const records: LinkSource[] = [
    { id: 'n1', title: 'Idées de Projet' },
    {
      id: 'n2',
      title: 'Plan',
      links: ['n1'],
      body: 'voir [[idees de projet]] et [[n3]] [[Inconnu]]',
    },
    { id: 'n3', title: 'Plan' },
    { id: 'g', title: 'Carte', nodes: [{ refId: 'n1', label: 'idée' }, { label: 'libre' }] },
  ];

  it('resolves ids first, then accent/case-insensitive titles (possibly ambiguous)', () => {
    const r = createLinkResolver(records);
    expect(r.resolve('n3')).toEqual(['n3']);
    expect(r.resolve('IDÉES  de projet')).toEqual(['n1']);
    expect(r.resolve('plan')).toEqual(['n2', 'n3']);
    expect(r.resolve('nothing')).toEqual([]);
    expect(r.titleOf('n1')).toBe('Idées de Projet');
    expect(r.titleOf('zzz')).toBeUndefined();
  });

  it('collects links, graph refs and wiki links without self-references', () => {
    const r = createLinkResolver(records);
    expect([...outgoingLinks(records[1]!, r)].sort()).toEqual(['n1', 'n3']);
    expect([...outgoingLinks(records[3]!, r)]).toEqual(['n1']);
    expect([...outgoingLinks({ id: 'x', title: 'Self', body: '[[Self]] [[x]]' }, r)]).toEqual([]);
  });

  it('does not read vault bodies', () => {
    const r = createLinkResolver(records);
    const vault: LinkSource = { id: 'v', vaultId: 'k', body: '[[n1]]', links: ['n3'] };
    expect([...outgoingLinks(vault, r)]).toEqual(['n3']);
  });

  it('linkGraph skips sandbox records unless asked', () => {
    const pool: LinkSource[] = [...records, { id: 's', sandbox: true, links: ['n1'] }];
    expect(linkGraph(pool).has('s')).toBe(false);
    expect([...(linkGraph(pool, { includeSandbox: true }).get('s') ?? [])]).toEqual(['n1']);
  });
});

describe('backlinks', () => {
  const records: LinkSource[] = [
    { id: 't', title: 'Cible', updatedAt: 1 },
    { id: 'a', title: 'A', links: ['t'], body: 'Une phrase sans lien.', updatedAt: 10 },
    {
      id: 'b',
      title: 'B',
      body: 'Avant [[cible|la cible]] après, puis [[t]] encore.',
      updatedAt: 20,
    },
    { id: 'c', title: 'C', nodes: [{ refId: 't', label: 'Nœud cible' }], updatedAt: 5 },
    { id: 'd', title: 'D', notes: 'Tâche liée à [[t#Section]]', updatedAt: 5 },
    { id: 's', title: 'S', body: '[[t]]', sandbox: true, updatedAt: 30 },
    { id: 'v', title: 'V', body: '[[t]]', vaultId: 'k', updatedAt: 30 },
    { id: 'z', title: 'Z', body: '`[[t]]` only code', updatedAt: 40 },
  ];

  it('finds every kind of reference, most recent first', () => {
    const result = backlinks(records, 't');
    expect(result.map((b) => b.id)).toEqual(['b', 'a', 'c', 'd']);
    const byId = new Map(result.map((b) => [b.id, b]));
    expect(byId.get('a')!.via).toEqual(['link']);
    expect(byId.get('b')!.via).toEqual(['wikilink']);
    expect(byId.get('b')!.mentions).toBe(2);
    expect(byId.get('c')!.via).toEqual(['graph']);
  });

  it('renders snippets with link labels', () => {
    const byId = new Map(backlinks(records, 't').map((b) => [b.id, b]));
    expect(byId.get('b')!.snippet).toBe('Avant la cible après, puis Cible encore.');
    expect(byId.get('d')!.snippet).toBe('Tâche liée à Cible › Section');
    expect(byId.get('a')!.snippet).toBe('Une phrase sans lien.');
    expect(byId.get('c')!.snippet).toBe('Nœud cible');
  });

  it('includes sandbox records on request and honours targetTitles', () => {
    expect(backlinks(records, 't', { includeSandbox: true }).map((b) => b.id)).toContain('s');
    const files: LinkSource[] = [{ id: 'n', body: 'Voir ![[rapport.pdf]]' }];
    expect(backlinks(files, 'file-1')).toEqual([]);
    const hit = backlinks(files, 'file-1', { targetTitles: ['Rapport.pdf'] });
    expect(hit.map((b) => [b.id, b.via, b.mentions])).toEqual([['n', ['wikilink'], 1]]);
  });

  it('cuts long snippets around the reference', () => {
    const body = `${'mot '.repeat(50)}[[t]]${' fin'.repeat(50)}`;
    const [b] = backlinks(
      [
        { id: 't', title: 'Cible' },
        { id: 'x', body },
      ],
      't',
      { snippetRadius: 12 },
    );
    expect(b!.snippet.startsWith('…')).toBe(true);
    expect(b!.snippet).toContain('Cible');
    expect(b!.snippet.length).toBeLessThan(40);
  });
});
