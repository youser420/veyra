"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { AgentCard } from "@/components/dashboard/AgentCard";
import { PublishModal } from "@/components/dashboard/PublishModal";
import type { Agent } from "@/types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [publishAgent, setPublishAgent] = useState<Agent | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  function loadAgents() {
    const q = showArchived ? "?mine=true&includeArchived=true" : "?mine=true";
    fetch(`/api/agents${q}`)
      .then((r) => r.json())
      .then((d) => setAgents(d.items ?? []));
  }

  useEffect(() => {
    loadAgents();
  }, [showArchived]);

  const visible = showArchived ? agents.filter((a) => a.status === "archived") : agents;

  return (
    <main className="flex min-h-screen bg-bg">
      <DashboardSidebar />
      <section className="flex-1 p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-5xl">My Agents</h1>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 font-mono text-xs text-text-2">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Show archived
            </label>
            <Link href="/verify" className="rounded bg-gold px-4 py-2 text-black">
              + Verify New Agent
            </Link>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="text-text-2">
            {showArchived ? "No archived agents." : "No agents yet. Verify your first agent to get started."}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onPublish={setPublishAgent}
                onChanged={loadAgents}
              />
            ))}
          </div>
        )}

        <PublishModal
          agent={publishAgent}
          open={!!publishAgent}
          onClose={() => setPublishAgent(null)}
          onPublished={loadAgents}
        />
      </section>
    </main>
  );
}
