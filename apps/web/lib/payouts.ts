import type { SupabaseClient } from "@supabase/supabase-js";

export const CREATOR_REVENUE_SHARE = 0.7;

function monthBounds(date = new Date()) {
  const periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    period_start: periodStart.toISOString().slice(0, 10),
    period_end: periodEnd.toISOString().slice(0, 10),
  };
}

/** Queue a pending creator payout (70% revenue share). Disbursement is manual in MVP. */
export async function queueCreatorPayout(
  supabase: SupabaseClient,
  params: {
    creatorId: string;
    agentId: string;
    amountUsdCents?: number | null;
    amountInrPaise?: number | null;
  }
) {
  const { period_start, period_end } = monthBounds();

  const { error } = await supabase.from("payouts").insert({
    creator_id: params.creatorId,
    agent_id: params.agentId,
    amount_usd: params.amountUsdCents
      ? Math.floor(params.amountUsdCents * CREATOR_REVENUE_SHARE)
      : null,
    amount_inr: params.amountInrPaise
      ? Math.floor(params.amountInrPaise * CREATOR_REVENUE_SHARE)
      : null,
    period_start,
    period_end,
    status: "pending",
  });

  if (error) throw error;
}
