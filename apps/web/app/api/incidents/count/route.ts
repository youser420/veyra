import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/server";

/** Active incidents = open or acknowledged (still in creator's queue). */
export async function GET() {
  const auth = await requireAuthUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createServiceSupabase();
  const { count, error } = await supabase
    .from("trust_incidents")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", auth.id)
    .in("status", ["open", "acknowledged"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ count: count ?? 0 });
}
