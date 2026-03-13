"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { NodeWithChildren } from "@/types";

interface NodeTreeProps {
  nodes: NodeWithChildren[];
  depth?: number;
  /** Ancestor slugs for building hrefs, e.g. ["linux", "permissions"] */
  pathSegments?: string[];
}

function buildHref(segments: string[], slug: string): string {
  return "/themes/" + [...segments, slug].join("/");
}

function NodeRow({
  node,
  depth,
  pathSegments,
}: {
  node: NodeWithChildren;
  depth: number;
  pathSegments: string[];
}) {
  const pathname = usePathname();
  const href = buildHref(pathSegments, node.slug);
  const isActive = pathname === href || pathname.startsWith(href + "/");

  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = useState(isActive || depth === 0);

  const dotColor = node.color ?? "#6366F1";

  return (
    <div>
      {/* Row */}
      <div
        className="group flex items-center gap-1.5 relative"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {/* Active left border — only for fiche nodes */}
        {isActive && node.type === 'fiche' && (
          <span
            className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent rounded-r"
            aria-hidden
          />
        )}

        {/* Chevron / spacer */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-center w-4 h-4 text-muted hover:text-text transition-colors shrink-0 cursor-pointer"
            aria-label={expanded ? "Réduire" : "Développer"}
          >
            {expanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Dot / color indicator */}
        <span
          className="w-2 h-2 rounded-sm shrink-0"
          style={{ backgroundColor: dotColor }}
          aria-hidden
        />

        {/* Label */}
        <Link
          href={href}
          className={[
            "flex-1 py-1 text-[13px] leading-none truncate transition-colors duration-150 cursor-pointer",
            "rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            isActive && node.type === 'fiche'
              ? "text-text font-medium bg-surface"
              : isActive && node.type === 'folder'
                ? "text-text font-medium"
                : "text-muted hover:text-text hover:bg-surface",
          ].join(" ")}
          style={{
            paddingRight: "8px",
            paddingTop: "6px",
            paddingBottom: "6px",
          }}
        >
          {node.title}
        </Link>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <NodeTree
          nodes={node.children}
          depth={depth + 1}
          pathSegments={[...pathSegments, node.slug]}
        />
      )}
    </div>
  );
}

export default function NodeTree({
  nodes,
  depth = 0,
  pathSegments = [],
}: NodeTreeProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {nodes.map((node) => (
        <NodeRow
          key={node.id}
          node={node}
          depth={depth}
          pathSegments={pathSegments}
        />
      ))}
    </div>
  );
}
