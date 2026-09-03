"use client";

import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";

type Payout = {
  id: string;
  amount_usd?: number;
  amount_inr?: number;
  status: string;
  created_at: string;
  agents?: { name?: string };
};

export default function EarningsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState({
    totalEarnedUsd: 0,
    thisMonthUsd: 0,
    pendingUsd: 0,
    revenueSharePercent: 70,
  });

  useEffect(() => {
    fetch("/api/payouts")
      .then((r) => r.json())
      .then((d) => {
        setPayouts(d.payouts ?? []);
        if (d.stats) setStats(d.stats);
      });
  }, []);

  const cards = [
    { label: "Total Earned", value: `$${(stats.totalEarnedUsd / 100).toFixed(2)}` },
    { label: "This Month", value: `$${(stats.thisMonthUsd / 100).toFixed(2)}` },
    { label: "Pending Payout", value: `$${(stats.pendingUsd / 100).toFixed(2)}` },
    { label: "Revenue Share", value: `${stats.revenueSharePercent}%` },
  ];

  return (
    <main className="flex min-h-screen bg-bg">
      <DashboardSidebar />
      <section className="flex-1 p-8">
        <h1 className="mb-8 font-display text-5xl">Earnings</h1>
        <div className="mb-10 grid gap-4 md:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="card-industrial p-4">
              <p className="font-mono text-xs uppercase tracking-widest text-text-2">{c.label}</p>
              <p className="mt-2 font-mono text-2xl text-gold">{c.value}</p>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-bg-2 font-mono text-xs uppercase text-text-2">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Agent</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="p-3 font-mono text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="p-3 font-mono">
                    {p.amount_usd ? `$${(p.amount_usd / 100).toFixed(2)}` : `₹${((p.amount_inr ?? 0) / 100).toFixed(0)}`}
                  </td>
                  <td className="p-3">{p.agents?.name ?? "—"}</td>
                  <td className="p-3">
                    <span className="rounded border border-border px-2 py-0.5 font-mono text-xs uppercase">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-text-2">
                    No payouts yet. Earnings appear when consumers subscribe to your agents.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
