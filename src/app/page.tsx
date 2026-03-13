import Link from "next/link";
import {
  BarChart2,
  TrendingUp,
  GraduationCap,
  Zap,
  Flame,
  MoreHorizontal,
  FileText,
  BookOpen,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ActivityChart } from "@/components/features/ActivityChart";

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveIcon(iconName: string | null): LucideIcon {
  if (!iconName) return FileText;
  const icons = LucideIcons as unknown as Record<
    string,
    LucideIcon | undefined
  >;
  return icons[iconName] ?? FileText;
}

function getTimeBadge(updatedAt: string, readCount: number): string {
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  if (readCount === 0 && diffHours < 24) return "NOUVEAU";
  if (diffHours < 1) return "À L'INSTANT";
  if (diffHours < 24) return `IL Y A ${diffHours}H`;
  const diffDays = Math.floor(diffHours / 24);
  return `IL Y A ${diffDays}J`;
}

function buildChartData(sessions: Array<{ created_at: string }>) {
  const countByDay = new Map<string, number>();
  for (const s of sessions) {
    const day = s.created_at.split("T")[0];
    countByDay.set(day, (countByDay.get(day) ?? 0) + 1);
  }
  const result: Array<{ day: string; count: number }> = [];
  const base = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    const day = d.toISOString().split("T")[0];
    result.push({ day, count: countByDay.get(day) ?? 0 });
  }
  return result;
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function Bar({
  value,
  color,
  className = "h-1.5",
}: {
  value: number;
  color: string;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={`w-full rounded-full overflow-hidden ${className}`}
      style={{ backgroundColor: "var(--progress-track)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // ── Round 1: all data in parallel ────────────────────────────────────────

  const [
    { count: fichesTotal },
    { count: fichesRead },
    { count: flashcardsDue },
    { data: dueCards },
    { count: quizCompleted },
    { count: quizLast7 },
    { count: quizPrev7 },
    { data: streakData },
    { data: allNodesData },
    { data: reviewSessionsData },
    { data: recentFichesData },
  ] = await Promise.all([
    supabaseAdmin.from("fiches").select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("fiches")
      .select("*", { count: "exact", head: true })
      .not("read_at", "is", null),
    supabaseAdmin
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .lte("next_review", today),
    supabaseAdmin
      .from("flashcards")
      .select("id, question, next_review, fiche_id")
      .lte("next_review", today)
      .order("next_review", { ascending: true })
      .limit(8),
    supabaseAdmin
      .from("review_sessions")
      .select("*", { count: "exact", head: true })
      .eq("type", "quiz"),
    supabaseAdmin
      .from("review_sessions")
      .select("*", { count: "exact", head: true })
      .eq("type", "quiz")
      .gte("created_at", sevenDaysAgo),
    supabaseAdmin
      .from("review_sessions")
      .select("*", { count: "exact", head: true })
      .eq("type", "quiz")
      .gte("created_at", fourteenDaysAgo)
      .lt("created_at", sevenDaysAgo),
    supabaseAdmin.rpc("get_streak"),
    supabaseAdmin
      .from("nodes")
      .select("id, title, slug, color, icon, parent_id, type, order_index"),
    supabaseAdmin
      .from("review_sessions")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("fiches")
      .select("id, read_at, read_count, updated_at")
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);

  // ── Node map ─────────────────────────────────────────────────────────────

  type NodeRow = {
    id: string;
    title: string;
    slug: string;
    color: string;
    icon: string | null;
    parent_id: string | null;
    type: string;
    order_index: number;
  };

  const nodeMap = new Map<string, NodeRow>(
    (allNodesData ?? []).map((n) => [n.id, n as NodeRow]),
  );

  const rootNodes = ((allNodesData as NodeRow[]) ?? [])
    .filter((n) => n.parent_id === null && n.type === "folder")
    .sort((a, b) => a.order_index - b.order_index);

  const recentFicheIds = (recentFichesData ?? []).map((f) => f.id);

  // ── Round 2: node progress + tags ────────────────────────────────────────

  const [progressResults, ficheTagsResult] = await Promise.all([
    Promise.all(
      rootNodes.map((n) =>
        supabaseAdmin.rpc("get_node_progress", { node_id: n.id }).then((r) => ({
          nodeId: n.id,
          progress:
            Array.isArray(r.data) && r.data.length > 0
              ? (r.data[0] as {
                  total_fiches: number;
                  read_fiches: number;
                  progress_pct: number;
                })
              : { total_fiches: 0, read_fiches: 0, progress_pct: 0 },
        })),
      ),
    ),
    recentFicheIds.length > 0
      ? supabaseAdmin
          .from("fiche_tags")
          .select("fiche_id, tags(id, name, color)")
          .in("fiche_id", recentFicheIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  // ── Derived values ────────────────────────────────────────────────────────

  const streak = typeof streakData === "number" ? streakData : 0;
  const total = fichesTotal ?? 0;
  const read = fichesRead ?? 0;
  const pct = total > 0 ? Math.round((read / total) * 100) : 0;
  const due = flashcardsDue ?? 0;
  const completed = quizCompleted ?? 0;
  const quizDelta = (quizLast7 ?? 0) - (quizPrev7 ?? 0);

  // Progress map
  const progressMap = new Map(
    progressResults.map((r) => [r.nodeId, r.progress]),
  );

  // Tags map
  type TagRow = {
    fiche_id: string;
    tags: { id: string; name: string; color: string } | null;
  };
  const tagsByFicheId = new Map<
    string,
    Array<{ name: string; color: string }>
  >();
  for (const row of (ficheTagsResult.data ?? []) as TagRow[]) {
    if (!row.tags) continue;
    const existing = tagsByFicheId.get(row.fiche_id) ?? [];
    existing.push(row.tags);
    tagsByFicheId.set(row.fiche_id, existing);
  }

  // Enriched recent fiches
  const enrichedFiches = (recentFichesData ?? []).map((f) => {
    const node = nodeMap.get(f.id);
    const subNode = node?.parent_id ? nodeMap.get(node.parent_id) : null;
    const themeNode = subNode?.parent_id
      ? nodeMap.get(subNode.parent_id)
      : null;
    return {
      id: f.id,
      title: node?.title ?? "—",
      slug: node?.slug ?? "",
      icon: node?.icon ?? null,
      color: node?.color ?? "#6366F1",
      read_at: f.read_at as string | null,
      read_count: f.read_count as number,
      updated_at: f.updated_at as string,
      tags: tagsByFicheId.get(f.id) ?? [],
      themeSlug: themeNode?.slug ?? "",
      subSlug: subNode?.slug ?? "",
    };
  });

  // Enriched due flashcards
  const enrichedCards = (dueCards ?? []).map((fc) => {
    const ficheNode = nodeMap.get(fc.fiche_id);
    const subNode = ficheNode?.parent_id
      ? nodeMap.get(ficheNode.parent_id)
      : null;
    const themeNode = subNode?.parent_id
      ? nodeMap.get(subNode.parent_id)
      : null;
    return {
      id: fc.id,
      question: fc.question,
      themeSlug: themeNode?.slug ?? "",
      subSlug: subNode?.slug ?? "",
    };
  });

  // Chart data
  const chartData = buildChartData(reviewSessionsData ?? []);
  const hasChartData = (reviewSessionsData ?? []).length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-screen-xl mx-auto">
      {/* ── Stats cards row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Fiches lues */}
        <div className="flex-1 min-w-0 overflow-hidden bg-surface border border-border rounded-xl p-5">
          <p className="text-sm text-muted">Fiches lues</p>
          <p className="text-3xl font-bold mt-1 text-text">
            {read}/{total}
          </p>
          <Bar value={pct} color="#6366F1" className="h-1.5 mt-3" />
          <span className="inline-block bg-accent/20 text-accent text-xs rounded px-2 py-0.5 mt-2">
            +{pct}%
          </span>
        </div>

        {/* Card 2 — Flashcards dues */}
        <div className="flex-1 min-w-0 overflow-hidden bg-surface border border-border rounded-xl p-5">
          <p className="text-sm text-muted">Flashcards dues</p>
          <p className="text-3xl font-bold mt-1 text-text">{due}</p>
          <Bar value={100} color="#F97316" className="h-1.5 mt-3" />
          {due > 0 ? (
            <span className="inline-block bg-warning/20 text-warning text-xs rounded px-2 py-0.5 mt-2">
              Review
            </span>
          ) : (
            <span className="inline-block bg-success/20 text-success text-xs rounded px-2 py-0.5 mt-2">
              À jour
            </span>
          )}
        </div>

        {/* Card 3 — Quiz complétés */}
        <div className="flex-1 min-w-0 overflow-hidden bg-surface border border-border rounded-xl p-5">
          <p className="text-sm text-muted">Quiz complétés</p>
          <p className="text-3xl font-bold mt-1 text-text">{completed}</p>
          <Bar value={100} color="#22C55E" className="h-1.5 mt-3" />
          {quizDelta > 0 && (
            <span className="inline-block bg-success/20 text-success text-xs rounded px-2 py-0.5 mt-2">
              +{quizDelta}
            </span>
          )}
        </div>

        {/* Card 4 — Streak */}
        <div className="flex-1 min-w-0 overflow-hidden bg-surface border border-border rounded-xl p-5">
          <p className="text-sm text-muted">Streak</p>
          <p className="text-3xl font-bold mt-1 text-text flex items-center gap-2">
            {streak} jour{streak !== 1 ? "s" : ""}
            {streak > 0 && <Flame size={16} style={{ color: "#F59E0B" }} />}
          </p>
          <Bar
            value={Math.min(streak * 10, 100)}
            color="#F59E0B"
            className="h-1.5 mt-3"
          />
        </div>
      </div>

      {/* ── Middle row ── */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Progression par thème */}
        <div className="flex-1 min-w-0 bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={16} style={{ color: "#6366F1" }} />
            <h2 className="font-semibold text-text">Progression par thème</h2>
          </div>

          {rootNodes.length === 0 ? (
            <p className="text-muted text-sm">Aucun thème importé</p>
          ) : (
            <div className="flex flex-col gap-4">
              {rootNodes.map((node) => {
                const prog = progressMap.get(node.id);
                const progPct = prog?.progress_pct ?? 0;
                return (
                  <div key={node.id}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-text">
                        {node.title}
                      </span>
                      <span className="text-sm text-muted">{progPct}%</span>
                    </div>
                    <Bar value={progPct} color={node.color} className="h-2" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Révisions sur 30 jours */}
        <div className="flex-1 min-w-0 bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} style={{ color: "#6366F1" }} />
            <h2 className="font-semibold text-text">Révisions sur 30 jours</h2>
          </div>

          {!hasChartData ? (
            <p className="text-muted text-sm text-center py-8">
              Aucune révision ces 30 derniers jours
            </p>
          ) : (
            <div className="w-full overflow-hidden">
              <ActivityChart data={chartData} />
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Continuer l'apprentissage */}
        <div className="flex-[2] min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} style={{ color: "#6366F1" }} />
              <h2 className="font-semibold text-text">
                Continuer l&apos;apprentissage
              </h2>
            </div>
            <Link
              href="/themes"
              className="text-sm text-accent hover:underline"
            >
              Voir tous les thèmes →
            </Link>
          </div>

          {enrichedFiches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 bg-surface border border-border rounded-xl">
              <BookOpen className="w-12 h-12 text-muted opacity-40" />
              <p className="text-muted text-sm text-center">
                Aucune fiche disponible
              </p>
              <p className="text-muted text-xs text-center">
                Importez votre première fiche
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {enrichedFiches.map((fiche) => {
                const Icon = resolveIcon(fiche.icon);
                const href =
                  fiche.themeSlug && fiche.subSlug && fiche.slug
                    ? `/themes/${fiche.themeSlug}/${fiche.subSlug}/${fiche.slug}`
                    : "#";
                const timeBadge = fiche.updated_at
                  ? getTimeBadge(fiche.updated_at, fiche.read_count)
                  : "NOUVEAU";
                const readPct = fiche.read_count > 0 ? 100 : 0;
                return (
                  <Link
                    key={fiche.id}
                    href={href}
                    className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 hover:border-accent/50 transition-colors duration-150 cursor-pointer"
                  >
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${fiche.color}1A` }}
                    >
                      <Icon size={20} style={{ color: fiche.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-text truncate">
                        {fiche.title}
                      </p>
                      {fiche.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {fiche.tags.map((tag) => (
                            <span
                              key={tag.name}
                              className="text-xs rounded-full px-2 py-0.5"
                              style={{
                                backgroundColor: `${tag.color}26`,
                                color: tag.color,
                              }}
                            >
                              #{tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <Bar
                        value={readPct}
                        color={fiche.color}
                        className="h-1 mt-2"
                      />
                      <p className="text-muted text-xs mt-1">{readPct}%</p>
                    </div>

                    {/* Time badge */}
                    <span className="text-xs bg-surface border border-border rounded px-2 py-1 text-muted shrink-0 whitespace-nowrap">
                      {timeBadge}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Flashcards à réviser */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} style={{ color: "#F97316" }} />
            <h2 className="font-semibold text-text">Flashcards à réviser</h2>
          </div>

          <div className="flex flex-col">
            {enrichedCards.length === 0 ? (
              <p className="text-muted text-sm py-4">
                Aucune flashcard à réviser
              </p>
            ) : (
              enrichedCards.slice(0, 4).map((card) => (
                <div
                  key={card.id}
                  className="bg-surface rounded-lg p-3 mb-2 flex justify-between items-start"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-medium text-text line-clamp-1">
                      {card.question}
                    </p>
                    <p className="text-xs text-muted font-mono mt-0.5">
                      {card.themeSlug}/{card.subSlug}
                    </p>
                  </div>
                  <MoreHorizontal
                    size={16}
                    className="text-muted shrink-0 mt-0.5"
                  />
                </div>
              ))
            )}
          </div>

          {due > 0 ? (
            <Link
              href="/practice"
              className="flex items-center justify-center gap-2 w-full mt-4 bg-warning text-white font-medium rounded-xl py-3 hover:bg-warning/90 transition-colors duration-150"
            >
              <Zap size={14} />
              Commencer la révision ({due})
            </Link>
          ) : (
            <button
              disabled
              className="w-full mt-4 bg-warning text-white font-medium rounded-xl py-3 opacity-50 cursor-not-allowed"
            >
              Commencer la révision (0)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
