import type { SupabaseClient } from "@supabase/supabase-js";
import { CHECK_NAMES as CHECKS } from "@/lib/constants/checkWeights";

export type AgentRow = {
  id: string;
  framework?: string;
  endpoint_url?: string | null;
  config_file_path?: string | null;
  submission_method?: string | null;
  category?: string | null;
};

export async function startMonitorRun(supabase: SupabaseClient, agent: AgentRow) {
  const framework = agent.framework || "generic_http";
  const method = agent.submission_method || "url";

  const { data: run, error: runError } = await supabase
    .from("verification_runs")
    .insert({
      agent_id: agent.id,
      status: "running",
      run_type: "monitor",
      snapshot_framework: framework,
      snapshot_endpoint_url: agent.endpoint_url,
      snapshot_config_path: agent.config_file_path,
      submission_method: method,
    })
    .select()
    .single();

  if (runError || !run) {
    throw new Error(runError?.message || "Failed to create monitor run");
  }

  await supabase
    .from("check_results")
    .insert(CHECKS.map((check_name) => ({ run_id: run.id, check_name, status: "pending" })));

  const engineUrl = process.env.VERIFICATION_ENGINE_URL?.replace(/\/\/localhost\b/i, "//127.0.0.1");
  if (engineUrl) {
    await fetch(`${engineUrl}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-engine-secret": process.env.VERIFICATION_ENGINE_SECRET || "",
      },
      body: JSON.stringify({
        run_id: run.id,
        agent_id: agent.id,
        endpoint_url: agent.endpoint_url,
        config_file_path: agent.config_file_path,
        category: agent.category,
        framework,
        submission_method: method,
        run_type: "monitor",
      }),
    });
  }

  return run.id as string;
}
