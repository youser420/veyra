"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { notifyIncidentsUpdated } from "@/lib/incidents";
import type { TrustIncident } from "@/types";

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-text-2",
  medium: "text-gold",
  high: "text-orange-400",
  critical: "text-red-400",
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<TrustIncident[]>([]);
  const [filter, setFilter] = useState<"active" | "all">("active");

  function load() {
    const q = filter === "active" ? "?active=true" : "";
    fetch(`/api/incidents${q}`)
      .then((r) => r.json())
      .then((d) => setIncidents(d.items ?? []));
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function updateStatus(id: string, status: "acknowledged" | "resolved") {
    const res = await fetch(`/api/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Update failed");

    notifyIncidentsUpdated();

    if (status === "resolved") {
      toast.success("Incident resolved — see the agent under My Agents", {
        action: { label: "My Agents", onClick: () => window.location.assign("/dashboard/agents") },
      });
    } else {
      toast.success("Incident acknowledged — still in your queue until resolved");
    }
    load();
  }

  return (
    <main className="flex min-h-screen bg-bg">
      <DashboardSidebar />
      <section className="flex-1 p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-5xl">Trust Incidents</h1>
          <div className="flex gap-2">
            {(["active", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded px-3 py-1 font-mono text-xs uppercase ${
                  filter === f ? "bg-gold text-black" : "border border-border"
                }`}
              >
                {f === "active" ? "queue" : "all"}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8 rounded border border-border bg-bg-2 p-4 text-sm text-text-2">
          <p className="font-mono text-xs uppercase tracking-widest text-gold">Actions</p>
          <ul className="mt-2 space-y-1">
            <li>
              <strong className="text-text">Acknowledge</strong> — you have seen the alert; it stays in
              the queue until you resolve it.
            </li>
            <li>
              <strong className="text-text">Resolve</strong> — close the incident; the agent remains
              under My Agents (e.g. with a certificate expired label). Re-verify when ready.
            </li>
            <li>
              <strong className="text-text">Re-verify</strong> — start a new verification run for that
              agent to renew trust and publish again.
            </li>
          </ul>
        </div>

        {incidents.length === 0 ? (
          <p className="text-text-2">
            No incidents{filter === "active" ? " in your queue" : ""}.
          </p>
        ) : (
          <div className="space-y-4">
            {incidents.map((inc) => {
              const agentName = (inc.agents as { name?: string } | undefined)?.name ?? "Agent";
              return (
                <div key={inc.id} className="card-industrial p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={`font-mono text-xs uppercase ${SEVERITY_COLORS[inc.severity] ?? ""}`}>
                        {inc.severity} · {inc.incident_type.replace(/_/g, " ")}
                      </p>
                      <h3 className="font-display text-xl">{inc.title}</h3>
                      <p className="mt-1 text-sm text-text-2">{inc.description}</p>
                      <p className="mt-2 font-mono text-xs text-text-3">
                        {agentName}
                        {inc.previous_score != null && inc.current_score != null && (
                          <> · {inc.previous_score} → {inc.current_score}</>
                        )}
                        {inc.auto_action && <> · auto: {inc.auto_action}</>}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-xs uppercase ${
                        inc.status === "open" ? "text-red-400" : "text-gold"
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {inc.status === "open" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(inc.id, "acknowledged")}
                        className="rounded border border-border px-3 py-1 text-sm"
                      >
                        Acknowledge
                      </button>
                    )}
                    {inc.status !== "resolved" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(inc.id, "resolved")}
                        className="rounded bg-teal px-3 py-1 text-sm text-black"
                      >
                        Resolve
                      </button>
                    )}
                    <Link
                      href={`/verify?agent=${inc.agent_id}`}
                      className="rounded border border-gold/50 px-3 py-1 text-sm text-gold"
                    >
                      Re-verify
                    </Link>
                    <Link
                      href="/dashboard/agents"
                      className="rounded border border-border px-3 py-1 text-sm text-text-3"
                    >
                      My Agents
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
