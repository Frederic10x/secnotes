import Link from "next/link";
import { FileText, FolderOpen } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getBreadcrumb } from "@/lib/get-breadcrumb";
import type { Node } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function resolveIcon(iconName: string | null): LucideIcon {
  if (!iconName) return FolderOpen;
  const icons = LucideIcons as unknown as Record<string, LucideIcon | undefined>;
  return icons[iconName] ?? FolderOpen;
}

interface NodeProgress {
  total_fiches: number;
  read_fiches: number;
  progress_pct: number;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface FolderPageProps {
  node: Node;
  children: Node[];
  /** URL path for the current page, e.g. /themes/linux or /themes/linux/fundamentals */
  basePath: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default async function FolderPage({ node, children, basePath }: FolderPageProps) {
  // 1. Breadcrumb
  const breadcrumb = await getBreadcrumb(node.id);

  // 2. Current node progress
  const { data: currentProgressRaw } = await supabaseAdmin.rpc("get_node_progress", {
    node_id: node.id,
  });
  const currentProgress: NodeProgress = (() => {
    if (!currentProgressRaw) return { total_fiches: 0, read_fiches: 0, progress_pct: 0 };
    const p = Array.isArray(currentProgressRaw) ? currentProgressRaw[0] : currentProgressRaw;
    return (p as NodeProgress) ?? { total_fiches: 0, read_fiches: 0, progress_pct: 0 };
  })();

  // 3. Children progress
  const childProgressResults = await Promise.all(
    children.map((child) =>
      supabaseAdmin.rpc("get_node_progress", { node_id: child.id })
    )
  );
  const childProgressMap = new Map<string, NodeProgress>();
  children.forEach((child, i) => {
    const raw = childProgressResults[i].data;
    if (raw) {
      const p = Array.isArray(raw) ? raw[0] : raw;
      if (p) childProgressMap.set(child.id, p as NodeProgress);
    }
  });

  // 4. Fiche children — read_at + last quiz score
  const ficheChildIds = children.filter((c) => c.type === "fiche").map((c) => c.id);
  const ficheReadMap = new Map<string, string | null>();
  const quizScoreMap = new Map<string, number | null>();

  if (ficheChildIds.length > 0) {
    const [ficheRes, sessionRes] = await Promise.all([
      supabaseAdmin.from("fiches").select("id, read_at").in("id", ficheChildIds),
      supabaseAdmin
        .from("review_sessions")
        .select("fiche_id, score, created_at")
        .in("fiche_id", ficheChildIds)
        .eq("type", "quiz")
        .order("created_at", { ascending: false }),
    ]);

    ficheRes.data?.forEach((f) => ficheReadMap.set(f.id, f.read_at));
    // Keep only the most recent score per fiche
    sessionRes.data?.forEach((s) => {
      if (s.fiche_id && !quizScoreMap.has(s.fiche_id)) {
        quizScoreMap.set(s.fiche_id, s.score);
      }
    });
  }

  // ── Breadcrumb segments ──────────────────────────────────────────────────────

  const breadcrumbSegments = [
    { label: "Thèmes", href: "/themes" },
    ...breadcrumb.map((n, i) => {
      // Build the href for each breadcrumb node
      const slugChain = breadcrumb.slice(0, i + 1).map((x) => x.slug);
      return {
        label: n.title,
        href: `/themes/${slugChain.join("/")}`,
      };
    }),
  ];

  const NodeIcon = resolveIcon(node.icon);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-6">
        {breadcrumbSegments.map((seg, i) => (
          <span key={seg.href} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted">&gt;</span>}
            {i === breadcrumbSegments.length - 1 ? (
              <span className="text-text font-medium">{seg.label}</span>
            ) : (
              <Link href={seg.href} className="text-muted hover:text-text transition-colors duration-150">
                {seg.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${node.color}25` }}
        >
          <NodeIcon size={24} style={{ color: node.color }} />
        </div>
        <h1 className="text-2xl font-bold text-text">{node.title}</h1>
      </div>

      {/* Progress */}
      <div className="mb-8 max-w-md">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted">
            {currentProgress.read_fiches} / {currentProgress.total_fiches} fiche
            {currentProgress.total_fiches !== 1 ? "s" : ""} lue
            {currentProgress.read_fiches !== 1 ? "s" : ""}
          </span>
          <span className="text-accent font-medium">{currentProgress.progress_pct}%</span>
        </div>
        <ProgressBar value={currentProgress.progress_pct} />
      </div>

      {/* Children grid */}
      {children.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <FolderOpen className="w-12 h-12 text-muted opacity-40" />
          <p className="text-muted text-sm text-center">Ce dossier est vide</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => {
            const href = `${basePath}/${child.slug}`;

            if (child.type === "folder") {
              return (
                <FolderCard
                  key={child.id}
                  node={child}
                  progress={childProgressMap.get(child.id)}
                  href={href}
                />
              );
            }

            // type === 'fiche'
            const readAt = ficheReadMap.get(child.id) ?? null;
            const quizScore = quizScoreMap.get(child.id) ?? null;
            return (
              <FicheCard
                key={child.id}
                node={child}
                readAt={readAt}
                quizScore={quizScore}
                href={href}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FolderCard({
  node,
  progress,
  href,
}: {
  node: Node;
  progress: NodeProgress | undefined;
  href: string;
}) {
  const Icon = resolveIcon(node.icon);
  const totalFiches = progress?.total_fiches ?? 0;
  const readFiches = progress?.read_fiches ?? 0;
  const progressPct = progress?.progress_pct ?? 0;

  return (
    <Link
      href={href}
      className="group block bg-surface border border-border rounded-xl overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer"
    >
      {/* Color band */}
      <div className="h-1.5 w-full" style={{ backgroundColor: node.color }} />

      <div className="p-5">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
          style={{ backgroundColor: `${node.color}20` }}
        >
          <Icon size={20} style={{ color: node.color }} />
        </div>

        {/* Title */}
        <h2 className="text-base font-semibold text-text mb-3">{node.title}</h2>

        {/* Progress */}
        <ProgressBar value={progressPct} className="mb-2" />
        <p className="text-xs text-muted">
          {readFiches} / {totalFiches} fiche{totalFiches !== 1 ? "s" : ""} lue
          {readFiches !== 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}

function FicheCard({
  node,
  readAt,
  quizScore,
  href,
}: {
  node: Node;
  readAt: string | null;
  quizScore: number | null;
  href: string;
}) {
  const isRead = readAt !== null;

  return (
    <Link
      href={href}
      className="group block bg-surface border border-border rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#6366F120]">
          <FileText size={20} className="text-accent" />
        </div>
        {/* Fiche badge */}
        <span
          className="text-[11px] font-medium rounded-full px-2 py-0.5 flex-shrink-0"
          style={{ backgroundColor: "#6366F126", color: "#6366F1" }}
        >
          Fiche
        </span>
      </div>

      {/* Title */}
      <h2 className="text-base font-semibold text-text mb-3 leading-snug">{node.title}</h2>

      {/* Footer row */}
      <div className="flex items-center gap-2 flex-wrap">
        {isRead ? (
          <span
            className="text-[11px] font-medium rounded-full px-2 py-0.5"
            style={{ backgroundColor: "#22C55E20", color: "#22C55E" }}
          >
            Lu
          </span>
        ) : (
          <span
            className="text-[11px] font-medium rounded-full px-2 py-0.5"
            style={{ backgroundColor: "#64748B20", color: "#64748B" }}
          >
            Non lu
          </span>
        )}
        {quizScore !== null && (
          <span
            className="text-[11px] font-medium rounded-full px-2 py-0.5"
            style={{ backgroundColor: "#F59E0B20", color: "#F59E0B" }}
          >
            Quiz : {quizScore}%
          </span>
        )}
      </div>
    </Link>
  );
}
