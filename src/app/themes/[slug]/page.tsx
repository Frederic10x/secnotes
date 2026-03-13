import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import FolderPage from "@/components/features/FolderPage";
import type { Node } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ThemeSlugPage({ params }: Props) {
  const { slug } = await params;

  // 1. Resolve root node by slug (parent_id IS NULL)
  const { data: nodeData } = await supabaseAdmin
    .from("nodes")
    .select("*")
    .eq("slug", slug)
    .is("parent_id", null)
    .single();

  if (!nodeData) notFound();
  const node = nodeData as Node;

  // 2. Redirect if this is a fiche (wrong route)
  if (node.type === "fiche") {
    redirect("/themes");
  }

  // 3. Fetch direct children ordered by order_index
  const { data: childrenData } = await supabaseAdmin
    .from("nodes")
    .select("*")
    .eq("parent_id", node.id)
    .order("order_index", { ascending: true });

  const children: Node[] = childrenData ?? [];

  return (
    <FolderPage node={node} basePath={`/themes/${slug}`}>
      {children}
    </FolderPage>
  );
}
