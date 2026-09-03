"use client";

import { ScoreRing } from "@/components/shared/ScoreRing";
import type { Agent } from "@/types";

export function AgentCard({
  agent,
  onSelect,
}: {
  agent: Agent & { profiles?: { full_name?: string } };
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="card-industrial w-full p-4 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-gold">{agent.category}</p>
        <ScoreRing score={agent.score || 0} size={72} />
      </div>
      <h3 className="mt-2 font-display text-xl">{agent.name}</h3>
      <p className="font-mono text-xs text-text-2">{agent.profiles?.full_name ?? "Creator"}</p>
      <p className="mt-2 line-clamp-2 text-sm text-text-2">{agent.description}</p>
      <div className="mt-4 border-t border-border pt-3 flex items-center justify-between">
        <span className="font-mono text-xs text-teal">
          ${((agent.price_monthly_usd || 0) / 100).toFixed(2)}/mo
        </span>
        <span className="text-sm text-gold">View →</span>
      </div>
    </button>
  );
}
