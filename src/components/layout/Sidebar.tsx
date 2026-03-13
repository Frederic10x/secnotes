import Link from "next/link";
import { Search, Settings, ShieldCheck } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Node, NodeWithChildren, Tag } from "@/types";
import NodeTree from "./NodeTree";

// Build a recursive tree from a flat list of nodes
function buildTree(nodes: Node[]): NodeWithChildren[] {
  const map = new Map<string, NodeWithChildren>();

  for (const node of nodes) {
    map.set(node.id, { ...node, children: [] });
  }

  const roots: NodeWithChildren[] = [];

  for (const node of map.values()) {
    if (node.parent_id === null) {
      roots.push(node);
    } else {
      const parent = map.get(node.parent_id);
      if (parent) {
        parent.children.push(node);
      }
    }
  }

  // Sort by order at each level
  const sortChildren = (items: NodeWithChildren[]) => {
    items.sort((a, b) => a.order_index - b.order_index);
    items.forEach((item) => sortChildren(item.children));
  };
  sortChildren(roots);

  return roots;
}

export default async function Sidebar() {
  const [{ data: nodesData }, { data: tagsData }] = await Promise.all([
    supabaseAdmin
      .from("nodes")
      .select("*")
      .order("order", { ascending: true }),
    supabaseAdmin.from("tags").select("*").order("name", { ascending: true }),
  ]);

  const nodes: Node[] = nodesData ?? [];
  const tags: Tag[] = tagsData ?? [];
  const tree = buildTree(nodes);

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-[220px] flex flex-col bg-surface border-r border-border z-40 overflow-hidden"
      aria-label="Navigation principale"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 shrink-0">
        <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center shrink-0">
          <ShieldCheck size={15} className="text-white" />
        </div>
        <span className="font-semibold text-[15px] text-text tracking-tight">
          SecNotes
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-2">
        {/* ESPACES section */}
        <div className="px-3 mb-3">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted px-2 mb-1.5">
            Thèmes
          </p>
          {tree.length > 0 ? (
            <NodeTree nodes={tree} />
          ) : (
            <p className="text-[12px] text-muted px-2 py-2 italic">
              Aucun thème
            </p>
          )}
        </div>

        {/* Separator */}
        {tags.length > 0 && (
          <div className="border-t border-border mx-3 my-2" />
        )}

        {/* TAGS section */}
        {tags.length > 0 && (
          <div className="px-3">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted px-2 mb-1.5">
              Tags
            </p>
            <div className="flex flex-col gap-0.5">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/themes?tag=${tag.name}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-muted hover:text-text hover:bg-background transition-colors duration-150 cursor-pointer group"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                    aria-hidden
                  />
                  <span className="truncate">#{tag.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Search + Settings */}
      <div className="shrink-0 border-t border-border px-3 py-2 flex flex-col gap-0.5">
        {/* Search button — opens ⌘K (CommandPalette placeholder) */}
        <button
          className="flex items-center gap-2.5 w-full px-2 py-2 rounded-md text-[13px] text-muted hover:text-text hover:bg-background transition-colors duration-150 cursor-pointer"
          aria-label="Ouvrir la recherche"
          data-command-palette-trigger
        >
          <Search size={14} className="shrink-0" />
          <span className="flex-1 text-left">Rechercher</span>
          <kbd className="text-[10px] bg-border text-muted px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </button>

        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-2 py-2 rounded-md text-[13px] text-muted hover:text-text hover:bg-background transition-colors duration-150 cursor-pointer"
        >
          <Settings size={14} className="shrink-0" />
          <span>Paramètres</span>
        </Link>
      </div>
    </aside>
  );
}
