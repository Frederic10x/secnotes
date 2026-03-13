import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/server';
import FicheTabs from '@/components/features/FicheTabs';
import FicheBottomBar from '@/components/ui/FicheBottomBar';
import type { Node, Flashcard, Tag } from '@/types';

interface Props {
  params: Promise<{ slug: string; sub: string; fiche: string }>;
}

function formatDateFr(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function parseHeadings(md: string): { id: string; text: string; level: 2 | 3 }[] {
  const regex = /^#{2,3} (.+)$/gm;
  const headings: { id: string; text: string; level: 2 | 3 }[] = [];
  let match;
  while ((match = regex.exec(md)) !== null) {
    const level = match[0].startsWith('###') ? 3 : 2;
    const text = match[1].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    headings.push({ id, text, level });
  }
  return headings;
}

export default async function FichePage({ params }: Props) {
  const { slug, sub, fiche: ficheParam } = await params;

  // Step 1: Resolve nodes
  const { data: themeNode } = await supabaseAdmin
    .from('nodes')
    .select('*')
    .eq('slug', slug)
    .is('parent_id', null)
    .eq('type', 'folder')
    .single<Node>();

  if (!themeNode) notFound();

  const { data: subthemeNode } = await supabaseAdmin
    .from('nodes')
    .select('*')
    .eq('slug', sub)
    .eq('parent_id', themeNode.id)
    .eq('type', 'folder')
    .single<Node>();

  if (!subthemeNode) notFound();

  const { data: ficheNode } = await supabaseAdmin
    .from('nodes')
    .select('*')
    .eq('slug', ficheParam)
    .eq('parent_id', subthemeNode.id)
    .single<Node>();

  if (!ficheNode) notFound();

  // If it's a folder, redirect to the folder page
  if (ficheNode.type === 'folder') {
    redirect(`/themes/${slug}/${sub}`);
  }

  // Step 2-9: Parallel fetches
  const [
    ficheResult,
    ficheTagsResult,
    siblingsResult,
    flashcardsResult,
    quizCountResult,
    lastQuizResult,
    prefsResult,
  ] = await Promise.all([
    supabaseAdmin.from('fiches').select('*').eq('id', ficheNode.id).single(),
    supabaseAdmin
      .from('fiche_tags')
      .select('tags(*)')
      .eq('fiche_id', ficheNode.id),
    supabaseAdmin
      .from('nodes')
      .select('*')
      .eq('parent_id', subthemeNode.id)
      .eq('type', 'fiche')
      .order('order_index'),
    supabaseAdmin
      .from('flashcards')
      .select('*')
      .eq('fiche_id', ficheNode.id)
      .order('created_at'),
    supabaseAdmin
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true })
      .eq('fiche_id', ficheNode.id),
    supabaseAdmin
      .from('review_sessions')
      .select('score, cards_correct, cards_total, created_at')
      .eq('fiche_id', ficheNode.id)
      .eq('type', 'quiz')
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin.from('user_preferences').select('font_size').eq('id', 1).single(),
  ]);

  if (!ficheResult.data) notFound();

  const fiche = ficheResult.data as {
    id: string;
    content_md: string;
    read_at: string | null;
    read_count: number;
    created_at: string;
    updated_at: string;
  };

  // Extract tags from nested join result
  const tags: Tag[] = (ficheTagsResult.data ?? [])
    .map((row) => {
      const tagData = row.tags;
      if (!tagData || Array.isArray(tagData)) return null;
      return tagData as Tag;
    })
    .filter((t): t is Tag => t !== null);

  const siblings: Node[] = (siblingsResult.data ?? []) as Node[];
  const flashcards: Flashcard[] = (flashcardsResult.data ?? []) as Flashcard[];
  const quizCount = quizCountResult.count ?? 0;

  const lastQuizSession =
    lastQuizResult.data && lastQuizResult.data.length > 0
      ? (lastQuizResult.data[0] as {
          score: number | null;
          cards_correct: number | null;
          cards_total: number | null;
          created_at: string;
        })
      : null;

  const prefs = prefsResult.data as { font_size: 'sm' | 'md' | 'lg' } | null;

  // Prev/next fiche
  const currentIndex = siblings.findIndex((s) => s.id === ficheNode.id);
  const prevFiche = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextFiche = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;
  const ficheFullPath = `/themes/${slug}/${sub}/${ficheParam}`;

  // Parse headings
  const headings = parseHeadings(fiche.content_md);

  // Breadcrumb
  const crumbs = [
    { label: 'Thèmes', href: '/themes' },
    { label: themeNode.title, href: `/themes/${slug}` },
    { label: subthemeNode.title, href: `/themes/${slug}/${sub}` },
  ];

  return (
    <div className="p-6 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted">&gt;</span>}
            <Link
              href={crumb.href}
              className="text-muted hover:text-text transition-colors duration-150"
            >
              {crumb.label}
            </Link>
          </span>
        ))}
      </nav>

      {/* Title */}
      <h1 className="text-3xl font-bold mt-2 text-text">{ficheNode.title}</h1>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-3 mt-3">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${tag.color}33`, color: tag.color }}
          >
            #{tag.name}
          </span>
        ))}
        {tags.length > 0 && <span className="text-muted">|</span>}
        <span className="text-sm text-muted">Créé le {formatDateFr(fiche.created_at)}</span>
        <span className="text-muted">·</span>
        <span className="flex items-center gap-1 text-sm text-muted">
          <Eye size={14} />
          Lu {fiche.read_count} fois
        </span>
      </div>

      {/* FicheTabs */}
      <FicheTabs
        contentMd={fiche.content_md}
        fontSize={prefs?.font_size ?? 'md'}
        headings={headings}
        flashcards={flashcards}
        quizCount={quizCount}
        lastQuizSession={lastQuizSession}
        ficheFullPath={ficheFullPath}
      />

      {/* Bottom bar */}
      <FicheBottomBar
        ficheId={ficheNode.id}
        isRead={fiche.read_at !== null}
        readAt={fiche.read_at}
        prevFiche={
          prevFiche
            ? {
                slug: prevFiche.slug,
                title: prevFiche.title,
                fullPath: `/themes/${slug}/${sub}/${prevFiche.slug}`,
              }
            : null
        }
        nextFiche={
          nextFiche
            ? {
                slug: nextFiche.slug,
                title: nextFiche.title,
                fullPath: `/themes/${slug}/${sub}/${nextFiche.slug}`,
              }
            : null
        }
        fichePath={ficheFullPath}
      />
    </div>
  );
}
