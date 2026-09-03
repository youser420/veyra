import crypto from "crypto";
import { NextResponse } from "next/server";
import { queueCreatorPayout } from "@/lib/payouts";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RazorpayWebhook = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        amount?: number;
        notes?: Record<string, string>;
      };
    };
  };
};

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";
  const secret = process.env.RAZORPAY_KEY_SECRET || "";

  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body) as RazorpayWebhook;
  const supabase = createServiceSupabase();

  if (payload.event === "payment.captured") {
    const payment = payload.payload?.payment?.entity;
    const agentId = payment?.notes?.agent_id;
    const consumerId = payment?.notes?.consumer_id;

    if (agentId && consumerId && payment?.amount) {
      const { data: agent } = await supabase
        .from("agents")
        .select("creator_id, price_monthly_inr")
        .eq("id", agentId)
        .single();

      if (agent) {
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await supabase.from("subscriptions").upsert(
          {
            consumer_id: consumerId,
            agent_id: agentId,
            razorpay_subscription_id: payment.id,
            payment_gateway: "razorpay",
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
          },
          { onConflict: "consumer_id,agent_id" }
        );

        await queueCreatorPayout(supabase, {
          creatorId: agent.creator_id,
          agentId,
          amountInrPaise: payment.amount,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
