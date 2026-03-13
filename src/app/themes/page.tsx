import Link from "next/link";
import { FolderOpen, FolderPlus } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Node } from "@/types";

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

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ThemesPage() {
  const { data: rootNodes } = await supabaseAdmin
    .from("nodes")
    .select("*")
    .is("parent_id", null)
    .eq("type", "folder")
    .order("order_index", { ascending: true });

  const nodes: Node[] = rootNodes ?? [];

  // Fetch progress for all root nodes in parallel
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

  if (nodes.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text">Mes thèmes</h1>
          <button
            disabled
            className="px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-lg opacity-40 cursor-not-allowed"
          >
            Nouveau thème
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <FolderPlus className="w-12 h-12 text-muted opacity-40" />
          <p className="text-muted text-sm text-center">
            Aucun thème — importez votre première fiche
          </p>
          <Link
            href="/settings"
            className="px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-[#4F46E5] transition-colors duration-150"
          >
            Aller aux paramètres
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-text">Mes thèmes</h1>
        <button
          disabled
          className="px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-lg opacity-40 cursor-not-allowed"
          title="Disponible dans une prochaine version"
        >
          Nouveau thème
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  {readFiches} / {totalFiches} fiche{totalFiches !== 1 ? "s" : ""} lue{readFiches !== 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
