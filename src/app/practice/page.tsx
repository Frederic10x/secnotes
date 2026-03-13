import { supabaseAdmin } from '@/lib/supabase/server';
import FlashcardSession, { type SessionCard } from '@/components/features/FlashcardSession';
import type { Flashcard, Node } from '@/types';

export default async function PracticePage() {
  const today = new Date().toISOString().split('T')[0];

  // Fetch all due flashcards
  const { data: flashcardsRaw } = await supabaseAdmin
    .from('flashcards')
    .select('*')
    .lte('next_review', today)
    .order('next_review', { ascending: true });

  const flashcards = (flashcardsRaw ?? []) as Flashcard[];

  // Fetch next review date for empty state
  const { data: nextReviewRow } = await supabaseAdmin
    .from('flashcards')
    .select('next_review')
    .order('next_review', { ascending: true })
    .limit(1)
    .single();

  const nextReviewDate: string | null =
    flashcards.length === 0 ? (nextReviewRow?.next_review ?? null) : null;

  if (flashcards.length === 0) {
    return <FlashcardSession cards={[]} nextReviewDate={nextReviewDate} />;
  }

  // Fetch fiche nodes
  const ficheIds = [...new Set(flashcards.map((f) => f.fiche_id))];
  const { data: ficheNodesRaw } = await supabaseAdmin
    .from('nodes')
    .select('*')
    .in('id', ficheIds);

  const ficheNodes = (ficheNodesRaw ?? []) as Node[];
  const ficheNodeMap = new Map(ficheNodes.map((n) => [n.id, n]));

  // Fetch subtheme nodes (parents of fiche nodes)
  const subthemeIds = [...new Set(ficheNodes.map((n) => n.parent_id).filter((id): id is string => id !== null))];
  const { data: subthemeNodesRaw } = await supabaseAdmin
    .from('nodes')
    .select('*')
    .in('id', subthemeIds);

  const subthemeNodes = (subthemeNodesRaw ?? []) as Node[];
  const subthemeNodeMap = new Map(subthemeNodes.map((n) => [n.id, n]));

  // Fetch theme nodes (parents of subtheme nodes)
  const themeIds = [...new Set(subthemeNodes.map((n) => n.parent_id).filter((id): id is string => id !== null))];
  const { data: themeNodesRaw } = await supabaseAdmin
    .from('nodes')
    .select('*')
    .in('id', themeIds);

  const themeNodes = (themeNodesRaw ?? []) as Node[];
  const themeNodeMap = new Map(themeNodes.map((n) => [n.id, n]));

  // Build session cards with hierarchy info
  const cards: SessionCard[] = flashcards.map((card) => {
    const ficheNode = ficheNodeMap.get(card.fiche_id);
    const subthemeNode = ficheNode?.parent_id ? subthemeNodeMap.get(ficheNode.parent_id) : undefined;
    const themeNode = subthemeNode?.parent_id ? themeNodeMap.get(subthemeNode.parent_id) : undefined;

    const themeTitle = themeNode?.title ?? '';
    const subthemeTitle = subthemeNode?.title ?? '';
    const nodeTitle = themeTitle && subthemeTitle ? `${themeTitle} > ${subthemeTitle}` : (ficheNode?.title ?? '');

    return {
      ...card,
      nodeTitle,
      nodeColor: ficheNode?.color ?? '#6366F1',
      ficheSlug: ficheNode?.slug ?? '',
      subSlug: subthemeNode?.slug ?? '',
      themeSlug: themeNode?.slug ?? '',
    };
  });

  return <FlashcardSession cards={cards} nextReviewDate={null} />;
}
