import { search } from '@pouxis/core';
import type { CollectionName, Collections, Id } from '@pouxis/core';
import type { NavViewId } from '../../app/routes.ts';

/** Display order of result groups, Spark-style: what you act on first. */
export const RESULT_GROUPS = ['tasks', 'events', 'notes', 'graphs', 'journal'] as const;
export type ResultGroup = (typeof RESULT_GROUPS)[number];

export interface ResultItem {
  id: Id;
  collection: CollectionName;
  title: string;
  snippet: string;
}

export interface ResultSection {
  collection: ResultGroup;
  items: ResultItem[];
}

export type SearchableRecords = { [K in CollectionName]: readonly Collections[K][] };

/** Builds a fresh lexical index over every searchable record (sandbox hidden by the engine). */
export function buildSearchIndex(records: SearchableRecords): search.SearchIndex {
  const index = search.createSearchIndex();
  for (const collection of RESULT_GROUPS) {
    for (const record of records[collection]) {
      index.add(search.toSearchDoc(collection, record as Collections[typeof collection]));
    }
  }
  return index;
}

/** Hits grouped by collection, at most `perGroup` each, groups in `RESULT_GROUPS` order. */
export function searchGrouped(
  index: search.SearchIndex,
  query: string,
  perGroup = 4,
): ResultSection[] {
  if (query.trim().length < 2) return [];
  const hits = index.search(query, { limit: perGroup * RESULT_GROUPS.length * 2 });
  const sections = new Map<ResultGroup, ResultItem[]>();
  for (const hit of hits) {
    const group = hit.collection as ResultGroup;
    const list = sections.get(group) ?? [];
    if (list.length >= perGroup) continue;
    list.push({ id: hit.id, collection: hit.collection, title: hit.title, snippet: hit.snippet });
    sections.set(group, list);
  }
  return RESULT_GROUPS.filter((g) => sections.has(g)).map((g) => ({
    collection: g,
    items: sections.get(g)!,
  }));
}

/** Where a record opens. Views read these params to focus the record. */
export function recordRoute(
  collection: CollectionName,
  id: Id,
): { view: NavViewId; params: Record<string, string> } {
  switch (collection) {
    case 'tasks':
      return { view: 'tasks', params: { task: id } };
    case 'events':
      return { view: 'calendar', params: { event: id } };
    case 'notes':
      return { view: 'ideas', params: { note: id } };
    case 'graphs':
      return { view: 'canvas', params: { graph: id } };
    case 'journal':
      return { view: 'today', params: { journal: id } };
  }
}
