import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getRazorpay } from "@/lib/razorpay";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const auth = await requireAuthUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { agentId, amount: amountOverride } = await req.json();
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  const supabase = createServiceSupabase();
  const { data: agent } = await supabase
    .from("agents")
    .select("id, price_monthly_inr, status")
    .eq("id", agentId)
    .eq("status", "published")
    .single();

  const amount = amountOverride ?? agent?.price_monthly_inr;
  if (!agent || !amount) {
    return NextResponse.json({ error: "Agent not found or INR price unavailable" }, { status: 404 });
  }

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt: `agent_${agentId}_${Date.now()}`,
    notes: {
      agent_id: agentId,
      consumer_id: auth.id,
    },
  });

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
  });
}
