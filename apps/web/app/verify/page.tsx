"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { SubmitForm } from "@/components/verification/SubmitForm";
import { CheckProgress } from "@/components/verification/CheckProgress";
import { ScoreReveal } from "@/components/verification/ScoreReveal";
import { PublishModal } from "@/components/dashboard/PublishModal";
import type { Agent, AgentPrefill } from "@/types";

type FlowStep = "form" | "submitting" | "progress" | "loading-results" | "results" | "published";

async function loadAgentResults(agentId: string) {
  const res = await fetch(`/api/agents/${agentId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load results");
  return data as { agent: Agent; run: Record<string, unknown> };
}

export default function VerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>("form");
  const [runId, setRunId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [agent, setAgent] = useState<Agent | null>(null);
  const [run, setRun] = useState<Record<string, unknown> | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [prefill, setPrefill] = useState<AgentPrefill | null>(null);
  const [isReverify, setIsReverify] = useState(false);

  const syncUrl = useCallback(
    (run: string, agent: string) => {
      router.replace(`/verify?run=${run}&agent=${agent}`, { scroll: false });
    },
    [router]
  );

  const clearUrl = useCallback(() => {
    router.replace("/verify", { scroll: false });
  }, [router]);

  const showResults = useCallback(async (aid: string) => {
    setStep("loading-results");
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        const data = await loadAgentResults(aid);
        if (data.agent.status === "verified" || data.agent.status === "failed" || data.run?.final_score != null) {
          setAgent(data.agent);
          setRun(data.run);
          setStep("results");
          if (data.agent.status === "failed") {
            const { toast } = await import("sonner");
            toast.error("Verification did not meet the trust threshold. You can re-run verification.");
          }
          return;
        }
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    const data = await loadAgentResults(aid);
    setAgent(data.agent);
    setRun(data.run);
    setStep("results");
  }, []);

  // Resume in-progress run, or prefill form for re-verify (?agent= only)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const run = params.get("run");
    const agentParam = params.get("agent");
    if (!agentParam) return;

    if (run) {
      setRestoring(true);
      setRunId(run);
      setAgentId(agentParam);

      fetch(`/api/verify/${run}`)
        .then(async (res) => {
          if (!res.ok) {
            clearUrl();
            setStep("form");
            return;
          }
          const data = await res.json();
          if (data.run?.status === "completed") {
            await showResults(agentParam);
          } else {
            setStep("progress");
          }
        })
        .finally(() => setRestoring(false));
      return;
    }

    setRestoring(true);
    fetch(`/api/agents/${agentParam}`)
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) return;
        const a = data.agent as Agent;
        setPrefill({
          id: a.id,
          name: a.name,
          description: a.description,
          category: a.category,
          framework: a.framework,
          submission_method: a.submission_method,
          endpoint_url: a.endpoint_url,
        });
        setAgentId(a.id);
        setIsReverify(true);
        setStep("form");
      })
      .finally(() => setRestoring(false));
  }, [showResults, clearUrl]);

  async function startVerification(payload: Record<string, unknown>) {
    setStep("submitting");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      setRunId(data.runId);
      setAgentId(data.agentId);
      syncUrl(data.runId, data.agentId);
      setStep("progress");
    } catch (e) {
      setStep("form");
      throw e;
    }
  }

  const onVerificationComplete = useCallback(() => {
    void showResults(agentId);
  }, [agentId, showResults]);

  function handleVerifyAnother() {
    setRunId("");
    setAgentId("");
    setAgent(null);
    setRun(null);
    setPrefill(null);
    setIsReverify(false);
    setStep("form");
    clearUrl();
  }

  function handlePublished() {
    setPublishOpen(false);
    setStep("published");
  }

  if (restoring) {
    return (
      <main className="min-h-screen bg-bg">
        <Navbar />
        <div className="mx-auto max-w-4xl px-6 py-10">
          <p className="text-text-2">Loading verification…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg">
      <Navbar />
      <div className="mx-auto max-w-4xl px-6 py-10">
        {step === "form" && (
          <>
            <h1 className="mb-6 font-display text-4xl">
              {isReverify ? "Re-verify Agent" : "Verify Your Agent"}
            </h1>
            {isReverify && (
              <p className="mb-4 text-sm text-text-2">
                Starting a new verification run. Previous runs are kept in history. Published
                agents are temporarily hidden from the marketplace until re-verified.
              </p>
            )}
            <SubmitForm
              key={prefill?.id ?? "new-agent"}
              onSubmit={startVerification}
              initial={prefill}
              reverify={isReverify}
            />
          </>
        )}

        {step === "submitting" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
              <h1 className="font-display text-3xl">Starting verification…</h1>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-3">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-gold" />
            </div>
          </div>
        )}

        {step === "progress" && runId && (
          <>
            <div className="mb-6 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
              <h1 className="font-display text-3xl">Trust verification in progress</h1>
            </div>
            <CheckProgress runId={runId} onDone={onVerificationComplete} />
          </>
        )}

        {step === "loading-results" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
              <h1 className="font-display text-3xl">Calculating trust score…</h1>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-3">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-teal" />
            </div>
          </div>
        )}

        {step === "results" && agent && run && (
          <>
            <ScoreReveal
              agent={agent}
              run={run}
              onPublish={() => setPublishOpen(true)}
              onVerifyAnother={handleVerifyAnother}
            />
            <PublishModal
              agent={agent}
              open={publishOpen}
              onClose={() => setPublishOpen(false)}
              onPublished={handlePublished}
            />
          </>
        )}

        {step === "published" && agent && (
          <div className="space-y-6 text-center">
            <h1 className="font-display text-4xl">Published to Marketplace</h1>
            <p className="text-text-2">
              <span className="text-teal">{agent.name}</span> is now live on the Veyra marketplace.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/marketplace" className="rounded bg-teal px-4 py-2 text-black">
                View Marketplace
              </Link>
              <Link href="/dashboard/agents" className="rounded border border-border px-4 py-2">
                My Agents
              </Link>
              <button type="button" onClick={handleVerifyAnother} className="rounded border border-border px-4 py-2">
                Verify Another
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
