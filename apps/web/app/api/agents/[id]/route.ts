import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  const supabase = createServiceSupabase();
  const { data: agent, error } = await supabase.from("agents").select("*").eq("id", params.id).single();

  if (error || !agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (agent.status !== "published" && (!user || agent.creator_id !== user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: run } = await supabase
    .from("verification_runs")
    .select("*, check_results(*)")
    .eq("agent_id", params.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ agent, run });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createServiceSupabase();

  const { data: existing } = await supabase
    .from("agents")
    .select("creator_id, status")
    .eq("id", params.id)
    .single();

  if (!existing || existing.creator_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();
  let patch: Record<string, unknown> = { updated_at: now };

  if (body.action === "unpublish") {
    if (existing.status !== "published") {
      return NextResponse.json({ error: "Only published agents can be unpublished" }, { status: 400 });
    }
    patch = { ...patch, status: "verified", published_at: null };
  } else if (body.action === "archive") {
    if (existing.status === "verifying") {
      return NextResponse.json({ error: "Cannot archive while verification is running" }, { status: 400 });
    }
    if (existing.status === "archived") {
      return NextResponse.json({ error: "Agent is already archived" }, { status: 400 });
    }
    patch = { ...patch, status: "archived", archived_at: now, published_at: null };
  } else {
    if (body.status === "published" && existing.status !== "verified" && existing.status !== "published") {
      return NextResponse.json({ error: "Agent must be verified before publishing" }, { status: 400 });
    }
    const nextMonitor = new Date();
    nextMonitor.setDate(nextMonitor.getDate() + 7);
    patch = {
      ...patch,
      status: body.status,
      price_monthly_usd: body.priceMonthlyUsd,
      price_monthly_inr: body.priceMonthlyInr,
      tags: body.tags,
      published_at: body.status === "published" ? now : undefined,
      monitor_enabled: body.status === "published" ? true : undefined,
      next_monitor_at: body.status === "published" ? nextMonitor.toISOString() : undefined,
    };
  }

  const { data, error } = await supabase.from("agents").update(patch).eq("id", params.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ agent: data });
}
