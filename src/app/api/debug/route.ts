// src/app/api/debug/route.ts
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("nodes")
    .select("id")
    .limit(1);
  return Response.json({ data, error });
}
