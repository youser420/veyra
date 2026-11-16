"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { getPaymentGateway } from "@/lib/paymentRouter";
import { createBrowserSupabase } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/shared/ScoreRing";
import type { Agent } from "@/types";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function SubscribeModal({
  agent,
  open,
  onClose,
}: {
  agent: (Agent & { profiles?: { full_name?: string } }) | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [payFromIndia, setPayFromIndia] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!agent) return null;

  async function ensureLoggedIn() {
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return null;
    }
    return user;
  }

  async function subscribeStripe() {
    const user = await ensureLoggedIn();
    if (!user) return;

    setLoading(true);
    const res = await fetch("/api/payments/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agent!.id }),
    });
    setLoading(false);

    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Payment failed");
    if (data.sessionUrl) window.location.href = data.sessionUrl;
  }

  async function subscribeRazorpay() {
    const user = await ensureLoggedIn();
    if (!user) return;

    const amount = agent!.price_monthly_inr || 0;
    if (!amount) return toast.error("INR price not set for this agent");

    setLoading(true);
    const res = await fetch("/api/payments/razorpay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agent!.id, amount }),
    });
    setLoading(false);

    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Payment failed");

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
      const rzp = new window.Razorpay!({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "Veyra",
        description: `Subscribe to ${agent!.name}`,
        handler: () => {
          toast.success("Payment successful — subscription activating");
          onClose();
        },
      });
      rzp.open();
    };
    document.body.appendChild(script);
  }

  function handleSubscribe() {
    const gateway = getPaymentGateway(payFromIndia ? "IN" : "US");
    if (gateway === "razorpay") subscribeRazorpay();
    else subscribeStripe();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg border-border bg-bg-2 text-text">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">{agent.name}</DialogTitle>
        </DialogHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-gold">{agent.category}</p>
            <p className="mt-2 text-sm text-text-2">{agent.description}</p>
            <p className="mt-3 font-mono text-sm text-teal">
              ${((agent.price_monthly_usd || 0) / 100).toFixed(2)}/mo · ₹
              {((agent.price_monthly_inr || 0) / 100).toFixed(0)}/mo
            </p>
          </div>
          <ScoreRing score={agent.score || 0} size={72} />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" checked={payFromIndia} onChange={(e) => setPayFromIndia(e.target.checked)} />
          Paying from India (Razorpay)
        </label>
        <Button onClick={handleSubscribe} disabled={loading} className="w-full bg-gold text-black">
          Subscribe
        </Button>
      </DialogContent>
    </Dialog>
  );
}
