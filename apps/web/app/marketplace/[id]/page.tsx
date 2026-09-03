"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { SubscribeModal } from "@/components/marketplace/SubscribeModal";
import type { Agent } from "@/types";

export default function AgentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((d) => setAgent(d.agent));
  }, [id]);

  if (!agent) {
    return (
      <main className="min-h-screen bg-bg">
        <Navbar />
        <div className="mx-auto max-w-3xl px-6 py-20 text-text-2">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg">
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-gold">{agent.category}</p>
            <h1 className="font-display text-5xl">{agent.name}</h1>
            <p className="mt-4 text-text-2">{agent.description}</p>
          </div>
          <ScoreRing score={agent.score || 0} size={120} />
        </div>
        <button
          onClick={() => setSubscribeOpen(true)}
          className="mt-8 rounded bg-gold px-6 py-3 text-black"
        >
          Subscribe
        </button>
      </div>
      <SubscribeModal agent={agent} open={subscribeOpen} onClose={() => setSubscribeOpen(false)} />
    </main>
  );
}
