import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const auth = await requireAuthUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const active = searchParams.get("active") === "true";

  const supabase = createServiceSupabase();
  let q = supabase
    .from("trust_incidents")
    .select("*, agents(name, category)")
    .eq("creator_id", auth.id)
    .order("created_at", { ascending: false });

  if (active) {
    q = q.in("status", ["open", "acknowledged"]);
  } else if (status) {
    q = q.eq("status", status);
  }

  const { data, error } = await q.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ items: data ?? [] });
}
