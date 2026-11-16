"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { scoreColor } from "@/lib/utils";

// Matches the engine's run order (apps/verification-engine/pipeline.py)
const ORDER = [
  "Task Competence",
  "Prompt Injection Resistance",
  "Guardrail Compliance",
  "Output Safety",
  "Hallucination Rate",
  "Behavioral Consistency",
  "Data Privacy",
  "Bias & Fairness",
  "Latency Profile",
];

type CheckRow = {
  id: string;
  check_name: string;
  status: string;
  score?: number;
};

function mergeCheckRow(prev: CheckRow[], row: CheckRow): CheckRow[] {
  const idx = prev.findIndex((c) => c.check_name === row.check_name);
  if (idx === -1) return [...prev, row];
  return prev.map((c) => (c.check_name === row.check_name ? { ...c, ...row } : c));
}

function checksComplete(checks: CheckRow[]) {
  return checks.length >= 8 && checks.every((c) => c.status === "passed" || c.status === "failed");
}

export function CheckProgress({ runId, onDone }: { runId: string; onDone: () => void }) {
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [runStatus, setRunStatus] = useState<string>("running");
  const doneCalled = useRef(false);

  const markDone = useCallback(() => {
    if (doneCalled.current) return;
    doneCalled.current = true;
    onDone();
  }, [onDone]);

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/verify/${runId}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.checks) setChecks(data.checks as CheckRow[]);
    if (data.run?.status) setRunStatus(data.run.status);

    if (data.run?.status === "completed" || checksComplete(data.checks ?? [])) {
      markDone();
    }
  }, [runId, markDone]);

  useEffect(() => {
    void fetchStatus();

    const poll = window.setInterval(() => void fetchStatus(), 1500);

    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(`run-${runId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "check_results" },
        (payload: { new: CheckRow & { run_id?: string } }) => {
          if (payload.new.run_id !== runId) return;
          setChecks((prev) => {
            const next = mergeCheckRow(prev, payload.new);
            if (checksComplete(next)) markDone();
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [runId, fetchStatus, markDone]);

  const ordered = ORDER.map(
    (name, i) => checks.find((c) => c.check_name === name) ?? { id: String(i), check_name: name, status: "pending" }
  );

  const finished = ordered.filter((c) => c.status === "passed" || c.status === "failed").length;
  const running = ordered.some((c) => c.status === "running");
  const progressPct = Math.round((finished / ORDER.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between font-mono text-xs text-text-2">
          <span>
            {runStatus === "completed"
              ? "Verification complete"
              : running
                ? "Running trust checks…"
                : "Waiting for engine…"}
          </span>
          <span>
            {finished}/{ORDER.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-3">
          <div
            className="h-full rounded-full bg-teal transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {ordered.map((c, i) => (
          <div key={c.check_name} className="card-industrial p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border font-mono text-xs">
                {c.status === "running" ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal border-t-transparent" />
                ) : c.status === "passed" || c.status === "failed" ? (
                  <span style={{ color: scoreColor(c.score ?? 0) }}>✓</span>
                ) : (
                  i + 1
                )}
              </div>
              <div className="flex-1">
                <p>{c.check_name}</p>
                {c.status === "running" && (
                  <div className="mt-2 h-1 overflow-hidden rounded bg-bg-3">
                    <div className="h-full w-1/2 animate-pulse bg-teal" />
                  </div>
                )}
              </div>
              {typeof c.score === "number" && (
                <span className="font-mono text-sm" style={{ color: scoreColor(c.score) }}>
                  {c.score}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
