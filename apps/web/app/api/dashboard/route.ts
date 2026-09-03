import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAuthUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createServiceSupabase();
  const { data: agents } = await supabase.from("agents").select("*").eq("creator_id", auth.id);

  const agentIds = (agents ?? []).map((a) => a.id);
  let totalSubscribers = 0;

  if (agentIds.length > 0) {
    const { count } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .in("agent_id", agentIds)
      .eq("status", "active");
    totalSubscribers = count ?? 0;
  }

  const published = (agents ?? []).filter((a) => a.status === "published");
  const recentAgents = [...(agents ?? [])]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 8);

  const { count: openIncidents } = await supabase
    .from("trust_incidents")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", auth.id)
    .in("status", ["open", "acknowledged"]);

  return NextResponse.json({
    stats: {
      totalAgents: agents?.length ?? 0,
      published: published.length,
      totalSubscribers,
      openIncidents: openIncidents ?? 0,
    },
    recentAgents,
  });
}
