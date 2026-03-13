'use server';

import { supabaseAdmin } from '@/lib/supabase/server';

export type TagInfo = {
  name: string;
  color: string;
};

export type SearchResult = {
  id: string;
  type: 'fiche' | 'flashcard' | 'tag';
  title: string;
  breadcrumb: string;
  tagObjects: TagInfo[];
  lastQuality: number | null;
  ficheCount: number;
  tagColor: string;
  path: string;
};

type RawRow = {
  id: string;
  type: string;
  title: string;
  breadcrumb: string;
  tags: string[];
  score: number;
};

type NodeRow = {
  id: string;
  slug: string;
  title: string;
  parent_id: string | null;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  // Round 1: global_search + tag search in parallel
  const [{ data: raw }, { data: tagData }] = await Promise.all([
    supabaseAdmin.rpc('global_search', { query }),
    supabaseAdmin
      .from('tags')
      .select('id, name, color')
      .ilike('name', `%${query}%`)
      .limit(5),
  ]);

  // Filter out folders — not displayed
  const searchRows = ((raw ?? []) as RawRow[]).filter((r) => r.type !== 'folder');

  const ficheRows = searchRows.filter((r) => r.type === 'fiche');
  const flashcardRows = searchRows.filter((r) => r.type === 'flashcard');

  // Round 2: flashcard details + fiche tags in parallel
  const flashcardIds = flashcardRows.map((r) => r.id);
  const ficheIds = ficheRows.map((r) => r.id);
  const tagIds = (tagData ?? []).map((t) => t.id);

  const [flashcardData, ficheTagRows, tagFicheTagRows] = await Promise.all([
    flashcardIds.length > 0
      ? supabaseAdmin
          .from('flashcards')
          .select('id, fiche_id, last_quality')
          .in('id', flashcardIds)
          .then((r) => r.data ?? [])
      : Promise.resolve([] as Array<{ id: string; fiche_id: string; last_quality: number | null }>),

    ficheIds.length > 0
      ? supabaseAdmin
          .from('fiche_tags')
          .select('fiche_id, tag_id')
          .in('fiche_id', ficheIds)
          .then((r) => r.data ?? [])
      : Promise.resolve([] as Array<{ fiche_id: string; tag_id: string }>),

    tagIds.length > 0
      ? supabaseAdmin
          .from('fiche_tags')
          .select('tag_id')
          .in('tag_id', tagIds)
          .then((r) => r.data ?? [])
      : Promise.resolve([] as Array<{ tag_id: string }>),
  ]);

  // Build flashcard map: flashcard_id → { fiche_id, last_quality }
  const flashcardMap = new Map<string, { fiche_id: string; last_quality: number | null }>();
  for (const fc of flashcardData) flashcardMap.set(fc.id, fc);

  // Collect all node IDs to resolve paths for
  const flashcardFicheIds = flashcardData.map((fc) => fc.fiche_id);
  const allNodeIds = [...new Set([...ficheIds, ...flashcardFicheIds])];

  // Round 3: fetch tag details for fiche_tags + node resolution in parallel
  const uniqueTagIds = [...new Set(ficheTagRows.map((ft) => ft.tag_id))];

  const [tagDetailRows, nodes] = await Promise.all([
    uniqueTagIds.length > 0
      ? supabaseAdmin
          .from('tags')
          .select('id, name, color')
          .in('id', uniqueTagIds)
          .then((r) => r.data ?? [])
      : Promise.resolve([] as Array<{ id: string; name: string; color: string }>),

    allNodeIds.length > 0
      ? supabaseAdmin
          .from('nodes')
          .select('id, slug, title, parent_id')
          .in('id', allNodeIds)
          .then((r) => r.data ?? [])
      : Promise.resolve([] as NodeRow[]),
  ]);

  // Build fiche → tags map
  const tagDetailMap = new Map(tagDetailRows.map((t) => [t.id, { name: t.name, color: t.color }]));
  const ficheTagsMap = new Map<string, TagInfo[]>();
  for (const ft of ficheTagRows) {
    const tag = tagDetailMap.get(ft.tag_id);
    if (!tag) continue;
    const arr = ficheTagsMap.get(ft.fiche_id) ?? [];
    arr.push(tag);
    ficheTagsMap.set(ft.fiche_id, arr);
  }

  // Build tag fiche count map
  const tagFicheCounts = new Map<string, number>();
  for (const row of tagFicheTagRows) {
    tagFicheCounts.set(row.tag_id, (tagFicheCounts.get(row.tag_id) ?? 0) + 1);
  }

  // Build node map
  const nodeMap = new Map<string, NodeRow>(nodes.map((n) => [n.id, n]));

  // Round 4: fetch parents
  const parentIds = [
    ...new Set(nodes.filter((n) => n.parent_id).map((n) => n.parent_id as string)),
  ];

  const parentMap = new Map<string, NodeRow>();
  if (parentIds.length > 0) {
    const { data: parents } = await supabaseAdmin
      .from('nodes')
      .select('id, slug, title, parent_id')
      .in('id', parentIds);
    for (const p of parents ?? []) parentMap.set(p.id, p);
  }

  // Round 5: fetch grandparents
  const grandParentIds = [
    ...new Set(
      [...parentMap.values()].filter((p) => p.parent_id).map((p) => p.parent_id as string),
    ),
  ];

  const grandParentMap = new Map<string, NodeRow>();
  if (grandParentIds.length > 0) {
    const { data: grandParents } = await supabaseAdmin
      .from('nodes')
      .select('id, slug, title, parent_id')
      .in('id', grandParentIds);
    for (const g of grandParents ?? []) grandParentMap.set(g.id, g);
  }

  function buildPath(nodeId: string): string {
    const node = nodeMap.get(nodeId);
    if (!node) return '/';
    const parent = node.parent_id ? parentMap.get(node.parent_id) : null;
    const grandParent = parent?.parent_id ? grandParentMap.get(parent.parent_id) : null;
    if (grandParent && parent) return `/themes/${grandParent.slug}/${parent.slug}/${node.slug}`;
    if (parent) return `/themes/${parent.slug}/${node.slug}`;
    return `/themes/${node.slug}`;
  }

  function buildBreadcrumb(nodeId: string): string {
    const node = nodeMap.get(nodeId);
    if (!node) return '';
    const parent = node.parent_id ? parentMap.get(node.parent_id) : null;
    const grandParent = parent?.parent_id ? grandParentMap.get(parent.parent_id) : null;
    const parts = [grandParent?.title, parent?.title, node.title].filter(Boolean);
    return parts.join(' > ');
  }

  // Build fiche/flashcard results (preserving global_search order)
  const mainResults: SearchResult[] = searchRows.map((row) => {
    if (row.type === 'flashcard') {
      const fc = flashcardMap.get(row.id);
      const ficheId = fc?.fiche_id ?? '';
      return {
        id: row.id,
        type: 'flashcard',
        title: row.title,
        breadcrumb: buildBreadcrumb(ficheId),
        tagObjects: [],
        lastQuality: fc?.last_quality ?? null,
        ficheCount: 0,
        tagColor: '',
        path: buildPath(ficheId),
      };
    }
    // fiche
    return {
      id: row.id,
      type: 'fiche',
      title: row.title,
      breadcrumb: buildBreadcrumb(row.id),
      tagObjects: ficheTagsMap.get(row.id) ?? [],
      lastQuality: null,
      ficheCount: 0,
      tagColor: '',
      path: buildPath(row.id),
    };
  });

  // Build tag results
  const tagResults: SearchResult[] = (tagData ?? []).map((tag) => ({
    id: tag.id,
    type: 'tag',
    title: tag.name,
    breadcrumb: '',
    tagObjects: [],
    lastQuality: null,
    ficheCount: tagFicheCounts.get(tag.id) ?? 0,
    tagColor: tag.color,
    path: `/themes?tag=${tag.name}`,
  }));

  return [...mainResults, ...tagResults];
}
