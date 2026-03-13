import Link from "next/link";
import { FolderOpen } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Node, Tag } from "@/types";

// ── Icon resolver ─────────────────────────────────────────────────────────────

function resolveIcon(iconName: string | null): LucideIcon {
  if (!iconName) return FolderOpen;
  const icons = LucideIcons as unknown as Record<string, LucideIcon | undefined>;
  return icons[iconName] ?? FolderOpen;
}

// ── Progress type ──────────────────────────────────────────────────────────────

interface NodeProgress {
  total_fiches: number;
  read_fiches: number;
  progress_pct: number;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ tag?: string }>;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ThemesPage({ searchParams }: Props) {
  const { tag: activeTag } = await searchParams;

  const { data: rootNodes } = await supabaseAdmin
    .from("nodes")
    .select("*")
    .is("parent_id", null)
    .eq("type", "folder")
    .order("order_index", { ascending: true });

  const allNodes: Node[] = rootNodes ?? [];

  // ── Fetch all used tags ────────────────────────────────────────────────────

  const { data: ficheTagRows } = await supabaseAdmin
    .from("fiche_tags")
    .select("tag_id");
  const tagIds = [...new Set((ficheTagRows ?? []).map((r) => r.tag_id))];

  let allTags: Tag[] = [];
  if (tagIds.length > 0) {
    const { data: tagsData } = await supabaseAdmin
      .from("tags")
      .select("*")
      .in("id", tagIds)
      .order("name");
    allTags = tagsData ?? [];
  }

  // ── Filter nodes by active tag ─────────────────────────────────────────────

  let nodes = allNodes;
  if (activeTag) {
    // Step 1: get tag ID
    const activeTagObj = allTags.find((t) => t.name === activeTag);
    if (activeTagObj) {
      // Step 2: get fiche IDs with this tag
      const { data: taggedRows } = await supabaseAdmin
        .from("fiche_tags")
        .select("fiche_id")
        .eq("tag_id", activeTagObj.id);
      const ficheIds = taggedRows?.map((r) => r.fiche_id) ?? [];

      if (ficheIds.length > 0) {
        const rootNodeIds = new Set(allNodes.map((n) => n.id));

        // Step 3: get parent nodes for those fiches
        const { data: ficheNodeData } = await supabaseAdmin
          .from("nodes")
          .select("id, parent_id")
          .in("id", ficheIds);

        const matchingRootIds = new Set<string>();
        const needGrandparent: string[] = [];

        ficheNodeData?.forEach((n) => {
          if (!n.parent_id) return;
          if (rootNodeIds.has(n.parent_id)) {
            matchingRootIds.add(n.parent_id);
          } else {
            needGrandparent.push(n.parent_id);
          }
        });

        // Step 4: check grandparent level
        if (needGrandparent.length > 0) {
          const { data: parentNodeData } = await supabaseAdmin
            .from("nodes")
            .select("id, parent_id")
            .in("id", [...new Set(needGrandparent)]);
          parentNodeData?.forEach((n) => {
            if (n.parent_id && rootNodeIds.has(n.parent_id)) {
              matchingRootIds.add(n.parent_id);
            }
          });
        }

        nodes = allNodes.filter((n) => matchingRootIds.has(n.id));
      } else {
        nodes = [];
      }
    } else {
      nodes = [];
    }
  }

  // ── Fetch progress for displayed nodes ────────────────────────────────────

  const progressResults = await Promise.all(
    nodes.map((node) =>
      supabaseAdmin.rpc("get_node_progress", { node_id: node.id })
    )
  );

  const progressMap = new Map<string, NodeProgress>();
  nodes.forEach((node, i) => {
    const raw = progressResults[i].data;
    if (raw) {
      const p = Array.isArray(raw) ? raw[0] : raw;
      progressMap.set(node.id, p as NodeProgress);
    }
  });

  // ── Empty state (no themes at all) ────────────────────────────────────────

  if (allNodes.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-screen-xl mx-auto">
        <h1 className="text-2xl font-bold text-text mb-8">Mes thèmes</h1>
        <EmptyState
          icon={FolderOpen}
          title="Aucun thème disponible"
          description="Importez votre premier thème pour commencer"
          action={{ label: "Aller aux paramètres", href: "/settings" }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Mes thèmes</h1>
        <button
          disabled
          className="px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-lg opacity-40 cursor-not-allowed"
          title="Disponible dans une prochaine version"
        >
          Nouveau thème
        </button>
      </div>

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <span className="text-sm text-muted">Filtrer par tag :</span>
          <Link
            href="/themes"
            className={`px-3 py-1 rounded-full text-sm border transition-colors duration-150 cursor-pointer ${
              !activeTag
                ? "bg-accent/20 border-accent text-accent"
                : "bg-surface border-border text-muted hover:text-text"
            }`}
          >
            Tous
          </Link>
          {allTags.map((tag) => {
            const isActive = activeTag === tag.name;
            return (
              <Link
                key={tag.id}
                href={`/themes?tag=${tag.name}`}
                className="px-3 py-1 rounded-full text-sm border transition-colors duration-150 cursor-pointer"
                style={
                  isActive
                    ? {
                        backgroundColor: `${tag.color}20`,
                        borderColor: tag.color,
                        color: tag.color,
                      }
                    : {
                        backgroundColor: "var(--surface)",
                        borderColor: "var(--border)",
                        color: "var(--muted)",
                      }
                }
              >
                #{tag.name}
              </Link>
            );
          })}
        </div>
      )}

      {/* Grid or empty state when filter yields no results */}
      {nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <FolderOpen className="w-12 h-12 text-muted opacity-40" />
          <p className="text-muted text-sm text-center">
            Aucun thème pour le tag #{activeTag}
          </p>
          <Link
            href="/themes"
            className="px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-[#4F46E5] transition-colors duration-150"
          >
            Voir tous les thèmes
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {nodes.map((node) => {
            const progress = progressMap.get(node.id);
            const totalFiches = progress?.total_fiches ?? 0;
            const readFiches = progress?.read_fiches ?? 0;
            const progressPct = progress?.progress_pct ?? 0;
            const Icon = resolveIcon(node.icon);

            return (
              <Link
                key={node.id}
                href={`/themes/${node.slug}`}
                className="group block bg-surface border border-border rounded-xl overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                {/* Color band */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: node.color }}
                />

                <div className="p-5">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${node.color}20` }}
                  >
                    <Icon size={20} style={{ color: node.color }} />
                  </div>

                  {/* Title */}
                  <h2 className="text-base font-semibold text-text mb-3">
                    {node.title}
                  </h2>

                  {/* Progress bar */}
                  <ProgressBar value={progressPct} className="mb-2" />

                  {/* Counter */}
                  <p className="text-xs text-muted">
                    {readFiches} / {totalFiches} fiche
                    {totalFiches !== 1 ? "s" : ""} lue
                    {readFiches !== 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
