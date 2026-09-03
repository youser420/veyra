"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { certExpiryLabel, certExpiryStatus } from "@/lib/certificates";
import type { Agent } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-text-2",
  verifying: "text-teal",
  verified: "text-gold",
  published: "text-teal",
  failed: "text-red-400",
  archived: "text-text-3",
};

async function lifecycleAction(agentId: string, action: "unpublish" | "archive") {
  const res = await fetch(`/api/agents/${agentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Action failed");
  return data.agent as Agent;
}

export function AgentCard({
  agent,
  onPublish,
  onChanged,
}: {
  agent: Agent;
  onPublish: (agent: Agent) => void;
  onChanged: () => void;
}) {
  const expiry = certExpiryStatus(agent.certificate_expires_at);
  const expiryLabel = certExpiryLabel(agent.certificate_expires_at);
  const canReverify = ["verified", "failed", "published"].includes(agent.status);

  async function handleUnpublish() {
    try {
      await lifecycleAction(agent.id, "unpublish");
      toast.success("Agent unpublished");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unpublish failed");
    }
  }

  async function handleArchive() {
    if (!confirm(`Archive "${agent.name}"? It will be hidden from your dashboard.`)) return;
    try {
      await lifecycleAction(agent.id, "archive");
      toast.success("Agent archived");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archive failed");
    }
  }

  return (
    <div className="card-industrial p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-gold">{agent.category}</p>
          <h3 className="font-display text-2xl">{agent.name}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-mono text-xs uppercase tracking-widest ${STATUS_COLORS[agent.status] ?? "text-text-2"}`}
            >
              {agent.status}
            </span>
            {expiry === "expired" && (
              <span className="rounded border border-red-400/40 px-1.5 py-0.5 font-mono text-[10px] uppercase text-red-400">
                cert expired
              </span>
            )}
          </div>
        </div>
        {typeof agent.score === "number" && <ScoreRing score={agent.score} size={72} />}
      </div>

      {expiryLabel && (
        <p
          className={`mt-3 rounded border px-2 py-1 font-mono text-xs ${
            expiry === "expired"
              ? "border-red-400/40 text-red-400"
              : "border-gold/40 text-gold"
          }`}
        >
          {expiryLabel}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {agent.status === "verified" && (
          <button
            type="button"
            onClick={() => onPublish(agent)}
            className="rounded bg-teal px-3 py-1 text-sm text-black"
          >
            Publish
          </button>
        )}
        {agent.status === "published" && (
          <>
            <Link href={`/marketplace/${agent.id}`} className="rounded border border-border px-3 py-1 text-sm">
              View Listing
            </Link>
            <button type="button" onClick={handleUnpublish} className="rounded border border-border px-3 py-1 text-sm">
              Unpublish
            </button>
          </>
        )}
        {canReverify && (
          <Link href={`/verify?agent=${agent.id}`} className="rounded border border-gold/50 px-3 py-1 text-sm text-gold">
            Re-verify
          </Link>
        )}
        {agent.status !== "archived" && agent.status !== "verifying" && (
          <button
            type="button"
            onClick={handleArchive}
            className="rounded border border-border px-3 py-1 text-sm text-text-3"
          >
            Archive
          </button>
        )}
      </div>
    </div>
  );
}
