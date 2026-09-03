import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const auth = await requireAuthUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { agentId } = await req.json();
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  const supabase = createServiceSupabase();
  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, name, price_monthly_usd, status")
    .eq("id", agentId)
    .eq("status", "published")
    .single();

  if (error || !agent?.price_monthly_usd) {
    return NextResponse.json({ error: "Agent not found or price unavailable" }, { status: 404 });
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: agent.name },
          unit_amount: agent.price_monthly_usd,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    metadata: {
      agent_id: agentId,
      consumer_id: auth.id,
    },
    success_url: `${appUrl}/marketplace/${agentId}?subscribed=1`,
    cancel_url: `${appUrl}/marketplace/${agentId}`,
  });

  return NextResponse.json({ sessionUrl: session.url });
}
