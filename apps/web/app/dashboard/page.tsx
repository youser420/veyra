"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { ScoreRing } from "@/components/shared/ScoreRing";
import type { Agent } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalAgents: 0,
    published: 0,
    totalSubscribers: 0,
    openIncidents: 0,
    revenueMonth: 0,
  });
  const [recentAgents, setRecentAgents] = useState<Agent[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/dashboard"), fetch("/api/payouts")]).then(async ([dashRes, payRes]) => {
      const dash = await dashRes.json();
      const pay = await payRes.json();
      setStats({
        totalAgents: dash.stats?.totalAgents ?? 0,
        published: dash.stats?.published ?? 0,
        totalSubscribers: dash.stats?.totalSubscribers ?? 0,
        openIncidents: dash.stats?.openIncidents ?? 0,
        revenueMonth: pay.stats?.thisMonthUsd ?? 0,
      });
      setRecentAgents(dash.recentAgents ?? []);
    });
  }, []);

  const cards = [
    { label: "Total Agents", value: stats.totalAgents },
    { label: "Published", value: stats.published },
    {
      label: "Open Incidents",
      value: stats.openIncidents,
      href: "/dashboard/incidents",
    },
    { label: "Revenue (Mo.)", value: `$${(stats.revenueMonth / 100).toFixed(2)}` },
  ];

  return (
    <main className="flex min-h-screen bg-bg">
      <DashboardSidebar />
      <section className="flex-1 p-8">
        <h1 className="mb-8 font-display text-5xl">Dashboard</h1>
        <div className="mb-10 grid gap-4 md:grid-cols-4">
          {cards.map((c) => {
            const inner = (
              <>
                <p className="font-mono text-xs uppercase tracking-widest text-text-2">{c.label}</p>
                <p
                  className={`mt-2 font-mono text-2xl ${
                    c.label === "Open Incidents" && stats.openIncidents > 0 ? "text-red-400" : "text-gold"
                  }`}
                >
                  {c.value}
                </p>
              </>
            );
            return (
              <div key={c.label} className="card-industrial p-4">
                {"href" in c && c.href ? (
                  <Link href={c.href} className="block hover:opacity-90">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
        <h2 className="mb-4 font-display text-2xl">Recent Agents</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-bg-2 font-mono text-xs uppercase text-text-2">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Score</th>
              </tr>
            </thead>
            <tbody>
              {recentAgents.map((a) => (
                <tr key={a.id} className="border-b border-border/50">
                  <td className="p-3">{a.name}</td>
                  <td className="p-3 font-mono text-xs uppercase">{a.status}</td>
                  <td className="p-3">
                    {typeof a.score === "number" ? <ScoreRing score={a.score} size={64} /> : "—"}
                  </td>
                </tr>
              ))}
              {recentAgents.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-text-2">
                    No agents yet.{" "}
                    <Link href="/verify" className="text-gold">
                      Verify your first agent
                    </Link>
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
