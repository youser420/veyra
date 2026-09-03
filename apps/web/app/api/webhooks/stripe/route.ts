import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { queueCreatorPayout } from "@/lib/payouts";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const agentId = session.metadata?.agent_id;
  const consumerId = session.metadata?.consumer_id;
  if (!agentId || !consumerId) return;

  const supabase = createServiceSupabase();
  const { data: agent } = await supabase.from("agents").select("creator_id, price_monthly_usd").eq("id", agentId).single();
  if (!agent) return;

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await supabase.from("subscriptions").upsert(
    {
      consumer_id: consumerId,
      agent_id: agentId,
      stripe_subscription_id: String(session.subscription || ""),
      payment_gateway: "stripe",
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
    },
    { onConflict: "consumer_id,agent_id" }
  );

  await queueCreatorPayout(supabase, {
    creatorId: agent.creator_id,
    agentId,
    amountUsdCents: agent.price_monthly_usd,
  });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") || "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createServiceSupabase();

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("stripe_subscription_id", sub.id);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef = (invoice as Stripe.Invoice & { subscription?: string | null }).subscription;
      if (subRef) {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", String(subRef));
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
