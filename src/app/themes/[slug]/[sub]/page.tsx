import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import FolderPage from "@/components/features/FolderPage";
import type { Node } from "@/types";

interface Props {
  params: Promise<{ slug: string; sub: string }>;
}

export default async function ThemeSubPage({ params }: Props) {
  const { slug, sub } = await params;

  // 1. Resolve parent (root theme) by slug
  const { data: parentData } = await supabaseAdmin
    .from("nodes")
    .select("id")
    .eq("slug", slug)
    .is("parent_id", null)
    .single();

  if (!parentData) notFound();

  // 2. Resolve current node by slug + parent_id
  const { data: nodeData } = await supabaseAdmin
    .from("nodes")
    .select("*")
    .eq("slug", sub)
    .eq("parent_id", parentData.id)
    .single();

  if (!nodeData) notFound();
  const node = nodeData as Node;

  // 3. Redirect if this node is a fiche (wrong route — should be at /themes/[slug]/[sub]/[fiche])
  if (node.type === "fiche") {
    redirect(`/themes/${slug}`);
  }

  // 4. Fetch direct children ordered by order_index
  const { data: childrenData } = await supabaseAdmin
    .from("nodes")
    .select("*")
    .eq("parent_id", node.id)
    .order("order_index", { ascending: true });

  const children: Node[] = childrenData ?? [];

  return (
    <FolderPage
      node={node}
      children={children}
      basePath={`/themes/${slug}/${sub}`}
    />
  );
}
