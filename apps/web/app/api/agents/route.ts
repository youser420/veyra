import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseConfigErrorResponse } from "@/lib/supabase/env";

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return supabaseConfigErrorResponse({ items: [] });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "published";
  const category = searchParams.get("category");
  const mine = searchParams.get("mine") === "true";

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch {
    return supabaseConfigErrorResponse({ items: [] });
  }

  if (mine) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const includeArchived = searchParams.get("includeArchived") === "true";
    let q = supabase.from("agents").select("*").eq("creator_id", user.id);
    if (!includeArchived) q = q.neq("status", "archived");
    const { data, error } = await q.order("updated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ items: data ?? [] });
  }

  const now = new Date().toISOString();
  let q = supabase.from("agents").select("*").eq("status", status);

  if (status === "published") {
    q = q.or(`certificate_expires_at.is.null,certificate_expires_at.gt.${now}`);
  }

  if (category && category !== "All") q = q.eq("category", category);

  const sort = searchParams.get("sort");
  if (sort === "score") q = q.order("score", { ascending: false });
  else if (sort === "price") q = q.order("price_monthly_usd", { ascending: true });
  else q = q.order("published_at", { ascending: false });

  const { data, error } = await q.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}
