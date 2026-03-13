import { notFound, redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import QuizSession from '@/components/features/QuizSession';
import type { Node, QuizQuestion, Tag } from '@/types';

interface Props {
  params: Promise<{ slug: string; sub: string; fiche: string }>;
}

export default async function QuizPage({ params }: Props) {
  const { slug, sub, fiche: ficheParam } = await params;

  // 1. Resolve theme node
  const { data: themeNode } = await supabaseAdmin
    .from('nodes')
    .select('*')
    .eq('slug', slug)
    .is('parent_id', null)
    .eq('type', 'folder')
    .single<Node>();

  if (!themeNode) notFound();

  // 2. Resolve subtheme node
  const { data: subthemeNode } = await supabaseAdmin
    .from('nodes')
    .select('*')
    .eq('slug', sub)
    .eq('parent_id', themeNode.id)
    .eq('type', 'folder')
    .single<Node>();

  if (!subthemeNode) notFound();

  // 3. Resolve fiche node
  const { data: ficheNode } = await supabaseAdmin
    .from('nodes')
    .select('*')
    .eq('slug', ficheParam)
    .eq('parent_id', subthemeNode.id)
    .single<Node>();

  if (!ficheNode) notFound();

  // 4. Fetch quiz questions
  const { data: rawQuestions } = await supabaseAdmin
    .from('quiz_questions')
    .select('*')
    .eq('fiche_id', ficheNode.id)
    .order('created_at');

  // 5. Redirect if no questions
  if (!rawQuestions || rawQuestions.length === 0) {
    redirect(`/themes/${slug}/${sub}/${ficheParam}`);
  }

  // Parse options — jsonb may come back as a string from Supabase
  const questions = rawQuestions.map((q) => ({
    ...q,
    options: typeof q.options === 'string' ? (JSON.parse(q.options) as string[]) : q.options,
  }));

  // 6. Fetch tags for fiche
  const { data: ficheTagsData } = await supabaseAdmin
    .from('fiche_tags')
    .select('tags(*)')
    .eq('fiche_id', ficheNode.id);

  const tags: Tag[] = (ficheTagsData ?? [])
    .map((row) => {
      const tagData = row.tags;
      if (!tagData || Array.isArray(tagData)) return null;
      return tagData as Tag;
    })
    .filter((t): t is Tag => t !== null);

  const breadcrumb = `${themeNode.title} > ${subthemeNode.title}`;
  const returnPath = `/themes/${slug}/${sub}/${ficheParam}`;

  return (
    <QuizSession
      questions={questions as QuizQuestion[]}
      ficheTitle={ficheNode.title}
      ficheId={ficheNode.id}
      breadcrumb={breadcrumb}
      tags={tags}
      returnPath={returnPath}
    />
  );
}
