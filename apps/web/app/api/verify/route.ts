import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseConfigErrorResponse } from "@/lib/supabase/env";
import { CHECK_NAMES as CHECKS } from "@/lib/constants/checkWeights";

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return supabaseConfigErrorResponse();
  }

  const auth = await requireAuthUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const framework = body.framework || "generic_http";
  const method = body.method || "url";

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch {
    return supabaseConfigErrorResponse();
  }

  let agent;

  if (body.agentId) {
    const { data: existing, error: loadError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", body.agentId)
      .eq("creator_id", auth.id)
      .single();

    if (loadError || !existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (["verifying", "archived", "pending"].includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot re-verify agent while status is ${existing.status}` },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("agents")
      .update({
        name: body.agentName || existing.name,
        description: body.description ?? existing.description,
        category: body.category || existing.category,
        submission_method: method,
        framework,
        oauth_provider: framework,
        endpoint_url: body.endpointUrl ?? existing.endpoint_url,
        config_file_path: body.configFilePath ?? existing.config_file_path,
        status: "verifying",
        published_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.agentId)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: updateError?.message || "Failed to start re-verification" }, { status: 400 });
    }
    agent = updated;
  } else {
    const { data: created, error: agentError } = await supabase
      .from("agents")
      .insert({
        creator_id: auth.id,
        name: body.agentName,
        description: body.description,
        category: body.category,
        submission_method: method,
        framework,
        oauth_provider: framework,
        endpoint_url: body.endpointUrl,
        config_file_path: body.configFilePath,
        status: "verifying",
      })
      .select()
      .single();

    if (agentError || !created) {
      const msg = agentError?.message || "Failed to create agent";
      const hint = msg.includes("framework")
        ? " Run supabase/migrations/002_phase0_framework.sql in Supabase SQL Editor, then retry."
        : "";
      return NextResponse.json({ error: msg + hint }, { status: 400 });
    }
    agent = created;
  }

  const { data: run, error: runError } = await supabase
    .from("verification_runs")
    .insert({
      agent_id: agent.id,
      status: "running",
      snapshot_framework: framework,
      snapshot_endpoint_url: agent.endpoint_url,
      snapshot_config_path: agent.config_file_path,
      submission_method: method,
    })
    .select()
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: runError?.message || "Failed to start run" }, { status: 400 });
  }

  await supabase
    .from("check_results")
    .insert(CHECKS.map((check_name) => ({ run_id: run.id, check_name, status: "pending" })));

  const engineUrl = process.env.VERIFICATION_ENGINE_URL?.replace(
    /\/\/localhost\b/i,
    "//127.0.0.1"
  );
  if (engineUrl) {
    fetch(`${engineUrl}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-engine-secret": process.env.VERIFICATION_ENGINE_SECRET || "",
      },
      body: JSON.stringify({
        run_id: run.id,
        agent_id: agent.id,
        // From the saved row: on re-verify the request body may omit the endpoint.
        endpoint_url: agent.endpoint_url,
        config_file_path: agent.config_file_path,
        category: agent.category,
        framework,
        submission_method: method,
      }),
    }).catch((err) => console.error("Verification engine dispatch failed:", err));
  } else {
    console.warn("VERIFICATION_ENGINE_URL not set — verification will not run");
  }

  return NextResponse.json({ runId: run.id, agentId: agent.id, framework });
}
