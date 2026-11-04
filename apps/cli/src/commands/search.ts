import { COLLECTIONS, search as searchEngine } from '@pouxis/core';
import type { CollectionName } from '@pouxis/core';
import { UsageError } from '../errors.ts';
import { oneLine, truncate } from '../format/text.ts';
import type { DataFile } from '../store/schema.ts';
import { intOption } from './shared.ts';
import type { Command } from './shared.ts';

/** Searches every collection with the core BM25F index (sandbox notes excluded). */
export function searchData(data: DataFile, query: string, limit: number): searchEngine.SearchHit[] {
  const index = searchEngine.createSearchIndex();
  for (const name of COLLECTIONS) {
    for (const record of data.collections[name]) {
      index.add(searchEngine.toSearchDoc(name, record as never));
    }
  }
  return index.search(query, { limit, prefix: false });
}

export const search: Command = {
  name: 'search',
  aliases: ['find', 's', 'grep'],
  options: { limit: { type: 'string', short: 'n' } },
  async run(ctx) {
    const { m, out } = ctx;
    const query = ctx.args.positionals.join(' ').trim();
    if (query === '')
      throw new UsageError(m.search.emptyQuery, {
        hint: m.errors.seeHelp('search'),
        command: 'search',
      });
    const limit = intOption(ctx, 'limit', 20, 'search');
    const hits = searchData(await ctx.store.load(), query, limit);
    if (ctx.json) {
      out.json(hits);
      return;
    }
    out.line(
      hits.length === 0
        ? m.search.results(0, query)
        : out.c.dim(m.search.results(hits.length, query)),
    );
    for (const hit of hits) {
      const kind = out.c.magenta(m.kinds[hit.collection as CollectionName].padEnd(10));
      out.line(
        `${out.c.dim(hit.id.slice(0, 8))}  ${kind} ${out.c.bold(oneLine(hit.title) || '—')}`,
      );
      if (hit.snippet)
        out.line(`          ${out.c.dim(truncate(oneLine(hit.snippet), out.width - 12))}`);
    }
  },
};
