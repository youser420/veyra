"use client";

import Link from "next/link";
import { CredentialBadge } from "@/components/shared/CredentialBadge";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { checkWeightLabel } from "@/lib/constants/checkWeights";
import { scoreLabel } from "@/lib/utils";
import type { Agent } from "@/types";

type CheckResultRow = {
  check_name: string;
  score?: number;
  details?: { summary?: string; skipped?: boolean };
};

export function ScoreReveal({
  agent,
  run,
  onPublish,
  onVerifyAnother,
}: {
  agent: Agent & { certificate_id?: string; certificate_issued_at?: string };
  run: Record<string, unknown> & { final_score?: number; check_results?: CheckResultRow[] };
  onPublish: () => void;
  onVerifyAnother: () => void;
}) {
  const score = run.final_score ?? agent.score ?? 0;
  const checks = (run.check_results as CheckResultRow[]) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-3xl">{agent.name}</h2>
        <span className="rounded border border-gold/40 bg-gold-muted px-2 py-1 font-mono text-xs uppercase tracking-widest text-gold">
          {agent.category}
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-teal">{scoreLabel(score)}</span>
      </div>

      <div className="flex justify-center">
        <ScoreRing score={score} size={120} />
      </div>

      <div className="space-y-2">
        {checks.map((c) => (
          <div key={c.check_name} className="card-industrial p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-sm">{c.check_name}</span>
                {checkWeightLabel(c.check_name) && (
                  <span className="ml-2 font-mono text-xs text-text-3">
                    {checkWeightLabel(c.check_name)} weight
                  </span>
                )}
              </div>
              <span className="font-mono text-sm">{c.score ?? "—"}</span>
            </div>
            {c.details?.summary && (
              <p className="mt-1 font-mono text-xs text-text-3">{c.details.summary}</p>
            )}
          </div>
        ))}
      </div>

      {agent.certificate_id && agent.certificate_issued_at && (
        <CredentialBadge
          certificateId={agent.certificate_id}
          score={score}
          issuedAt={agent.certificate_issued_at}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <button onClick={onPublish} className="rounded bg-teal px-4 py-2 text-black">
          Publish to Marketplace
        </button>
        <button onClick={onVerifyAnother} className="rounded border border-border px-4 py-2">
          Verify Another
        </button>
        <Link href="/dashboard" className="rounded border border-border px-4 py-2 text-text-2">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
