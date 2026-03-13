import { supabaseAdmin } from "@/lib/supabase/server";

export default async function Page() {
  const { data, error } = await supabaseAdmin
    .from("user_preferences")
    .select("*")
    .single();

  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "monospace",
        background: "#0A0C14",
        color: "#E2E8F0",
        minHeight: "100vh",
      }}
    >
      {error ? (
        <p style={{ color: "#EF4444" }}>❌ {error.message}</p>
      ) : (
        <p style={{ color: "#22C55E" }}>
          ✅ Supabase OK — theme: {data.theme}, font_size: {data.font_size}
        </p>
      )}
    </div>
  );
}
