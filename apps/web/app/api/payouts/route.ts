import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { CREATOR_REVENUE_SHARE } from "@/lib/payouts";

export async function GET() {
  const auth = await requireAuthUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createServiceSupabase();
  const { data: payouts, error } = await supabase
    .from("payouts")
    .select("*, agents(name)")
    .eq("creator_id", auth.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: agents } = await supabase
    .from("agents")
    .select("id, status")
    .eq("creator_id", auth.id);

  const published = (agents ?? []).filter((a) => a.status === "published").length;
  const totalUsd = (payouts ?? []).reduce((s, p) => s + (p.amount_usd || 0), 0);
  const pendingUsd = (payouts ?? [])
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + (p.amount_usd || 0), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonthUsd = (payouts ?? [])
    .filter((p) => p.created_at >= monthStart)
    .reduce((s, p) => s + (p.amount_usd || 0), 0);

  return NextResponse.json({
    payouts: payouts ?? [],
    stats: {
      totalEarnedUsd: totalUsd,
      thisMonthUsd,
      pendingUsd,
      publishedAgents: published,
      revenueSharePercent: Math.round(CREATOR_REVENUE_SHARE * 100),
    },
  });
}
