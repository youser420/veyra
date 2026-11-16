import type { SupabaseClient } from "@supabase/supabase-js";

// The engine runs on Render's free tier, which sleeps when idle and takes ~30-60s to wake.
// Keep this below the route's maxDuration so we can still record the failure.
const DISPATCH_TIMEOUT_MS = 50_000;

export type EngineJob = {
  run_id: string;
  agent_id: string;
  endpoint_url?: string | null;
  config_file_path?: string | null;
  category?: string | null;
  framework: string;
  submission_method: string;
  run_type?: "verification" | "monitor";
};

/**
 * Hand a run to the verification engine and wait until it has accepted it.
 * Fire-and-forget is unsafe on Vercel: the function can be frozen as soon as the
 * response is sent, silently dropping the request and leaving the agent "verifying".
 */
export async function dispatchToEngine(job: EngineJob): Promise<{ ok: true } | { ok: false; error: string }> {
  const engineUrl = process.env.VERIFICATION_ENGINE_URL?.replace(/\/\/localhost\b/i, "//127.0.0.1");
  if (!engineUrl) return { ok: false, error: "Verification engine is not configured" };

  try {
    const res = await fetch(`${engineUrl}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-engine-secret": process.env.VERIFICATION_ENGINE_SECRET || "",
      },
      body: JSON.stringify(job),
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, error: `Verification engine rejected the run (HTTP ${res.status})` };
    return { ok: true };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return {
      ok: false,
      error: timedOut
        ? "Verification engine is waking up — please retry in a minute"
        : "Verification engine is unreachable",
    };
  }
}

/** Record a run the engine never received, so nothing is left stuck in "pending"/"verifying". */
export async function markDispatchFailed(
  supabase: SupabaseClient,
  runId: string,
  error: string,
  agentId?: string
) {
  const now = new Date().toISOString();
  await supabase
    .from("check_results")
    .update({ status: "failed", details: { summary: error, inconclusive: true }, completed_at: now })
    .eq("run_id", runId)
    .in("status", ["pending", "running"]);
  await supabase.from("verification_runs").update({ status: "failed", completed_at: now }).eq("id", runId);
  if (agentId) {
    await supabase.from("agents").update({ status: "failed", updated_at: now }).eq("id", agentId);
  }
}
