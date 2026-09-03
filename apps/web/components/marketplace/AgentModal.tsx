"use client";

import { ScoreRing } from "@/components/shared/ScoreRing";
import type { Agent } from "@/types";

export function AgentModal({
  agent,
  onClose,
  onSubscribe,
}: {
  agent: (Agent & { profiles?: { full_name?: string } }) | null;
  onClose: () => void;
  onSubscribe: () => void;
}) {
  if (!agent) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card-industrial max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-gold">{agent.category}</p>
            <h2 className="font-display text-3xl">{agent.name}</h2>
            <p className="mt-1 font-mono text-xs text-text-2">
              {agent.profiles?.full_name ?? "Verified creator"}
            </p>
          </div>
          <ScoreRing score={agent.score || 0} size={88} />
        </div>
        <p className="mt-4 text-sm text-text-2">{agent.description}</p>
        {agent.tags && agent.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {agent.tags.map((t) => (
              <span key={t} className="rounded bg-teal-dim px-2 py-1 font-mono text-xs uppercase tracking-wider text-teal">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <p className="font-mono text-sm">
            <span className="text-teal">${((agent.price_monthly_usd || 0) / 100).toFixed(2)}/mo</span>
            {" · "}
            <span className="text-gold">₹{((agent.price_monthly_inr || 0) / 100).toFixed(0)}/mo</span>
          </p>
          <button onClick={onSubscribe} className="rounded bg-gold px-4 py-2 text-black">
            Use Agent
          </button>
        </div>
        <button onClick={onClose} className="mt-3 w-full text-sm text-text-2 hover:text-text">
          Close
        </button>
      </div>
    </div>
  );
}
