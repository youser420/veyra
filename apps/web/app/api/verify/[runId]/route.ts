import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseConfigErrorResponse } from "@/lib/supabase/env";

export async function GET(_: Request, { params }: { params: { runId: string } }) {
  if (!isSupabaseConfigured()) {
    return supabaseConfigErrorResponse();
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabase();

  const { data: run, error: runError } = await supabase
    .from("verification_runs")
    .select("id, agent_id, status, final_score, started_at, completed_at, agents!inner(creator_id)")
    .eq("id", params.runId)
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const agentRel = run.agents as unknown as
    | { creator_id: string }
    | { creator_id: string }[];
  const agent = Array.isArray(agentRel) ? agentRel[0] : agentRel;
  if (!agent || agent.creator_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: checks, error: checksError } = await supabase
    .from("check_results")
    .select("id, check_name, status, score, completed_at")
    .eq("run_id", params.runId)
    .order("check_name");

  if (checksError) {
    return NextResponse.json({ error: checksError.message }, { status: 400 });
  }

  const { agents: _agents, ...runRow } = run;

  return NextResponse.json({
    checks: checks ?? [],
    run: runRow,
  });
}
