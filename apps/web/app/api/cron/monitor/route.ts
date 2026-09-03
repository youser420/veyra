import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { startMonitorRun } from "@/lib/monitoring";

function authorize(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("x-cron-secret");
  const bearer = req.headers.get("authorization");
  return header === expected || bearer === `Bearer ${expected}`;
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabase();
  const now = new Date().toISOString();
  const queued: string[] = [];
  const expired: string[] = [];

  // Certificate expiry → incident + unpublish
  const { data: expiredAgents } = await supabase
    .from("agents")
    .select("id, name, creator_id, score, certificate_expires_at")
    .eq("status", "published")
    .lt("certificate_expires_at", now);

  for (const agent of expiredAgents ?? []) {
    await supabase
      .from("agents")
      .update({ status: "verified", published_at: null, updated_at: now })
      .eq("id", agent.id);

    await supabase.from("trust_incidents").insert({
      agent_id: agent.id,
      creator_id: agent.creator_id,
      incident_type: "certificate_expired",
      severity: "high",
      title: `Certificate expired: ${agent.name}`,
      description: "Agent was unpublished automatically. Re-verify to restore marketplace listing.",
      previous_score: agent.score,
      current_score: agent.score,
      auto_action: "unpublished",
    });
    expired.push(agent.id);
  }

  // Scheduled monitors for published agents
  const { data: dueAgents } = await supabase
    .from("agents")
    .select("*")
    .eq("status", "published")
    .eq("monitor_enabled", true)
    .or(`next_monitor_at.is.null,next_monitor_at.lte.${now}`)
    .limit(5);

  for (const agent of dueAgents ?? []) {
    if (!agent.endpoint_url) continue;
    try {
      await startMonitorRun(supabase, agent);
      queued.push(agent.id);
    } catch (e) {
      console.error(`Monitor queue failed for ${agent.id}:`, e);
    }
  }

  return NextResponse.json({
    monitors_queued: queued.length,
    agent_ids: queued,
    certificates_expired: expired.length,
    expired_agent_ids: expired,
  });
}
