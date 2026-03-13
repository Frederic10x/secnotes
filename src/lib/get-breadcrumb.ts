import { supabaseAdmin } from "@/lib/supabase/server";
import type { Node } from "@/types";

/**
 * Walks up the parent chain from nodeId to root.
 * Returns nodes ordered from root → current node.
 */
export async function getBreadcrumb(nodeId: string): Promise<Node[]> {
  const chain: Node[] = [];
  let currentId: string | null = nodeId;

  while (currentId) {
    const { data }: { data: Node | null } = await supabaseAdmin
      .from("nodes")
      .select("*")
      .eq("id", currentId)
      .single();

    if (!data) break;
    chain.unshift(data);
    currentId = data.parent_id;
  }

  return chain;
}
