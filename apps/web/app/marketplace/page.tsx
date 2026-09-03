"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { AgentCard } from "@/components/marketplace/AgentCard";
import { AgentFilters } from "@/components/marketplace/AgentFilters";
import { AgentModal } from "@/components/marketplace/AgentModal";
import { SubscribeModal } from "@/components/marketplace/SubscribeModal";
import { fetchJson } from "@/lib/api-client";
import type { Agent } from "@/types";

const CATEGORIES = [
  "All",
  "General",
  "Legal",
  "Finance",
  "Healthcare",
  "Engineering",
  "Research",
  "Sales",
  "Education",
  "Customer Support",
];

export default function MarketplacePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("score");
  const [selected, setSelected] = useState<Agent | null>(null);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ status: "published", sort });
    if (category !== "All") params.set("category", category);

    setLoading(true);
    fetchJson<{ items?: Agent[]; error?: string }>(`/api/agents?${params}`)
      .then((d) => {
        setAgents(d.items || []);
        setConfigError(null);
      })
      .catch((err: Error) => {
        setAgents([]);
        const message = err.message || "Failed to load marketplace";
        setConfigError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [category, sort]);

  const filtered = useMemo(() => {
    return agents.filter((a) =>
      `${a.name} ${a.description ?? ""} ${a.category}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [agents, search]);

  return (
    <main className="min-h-screen bg-bg">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-5xl">Marketplace</h1>
        <p className="mt-2 text-text-2">
          {loading ? "Loading…" : `${agents.length} verified agents`}
        </p>

        {configError && (
          <div className="mt-6 rounded-lg border border-gold/40 bg-gold-muted p-4 text-sm text-text">
            <p className="font-mono text-gold">Setup required</p>
            <p className="mt-2">{configError}</p>
            <p className="mt-2 text-text-2">
              Copy{" "}
              <code className="text-teal">.env.local.example</code> to{" "}
              <code className="text-teal">apps/web/.env.local</code> and add your Supabase project
              URL and keys from the Supabase dashboard.
            </p>
          </div>
        )}

        <div className="my-6 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <AgentFilters search={search} setSearch={setSearch} />
          </div>
          <select
            className="rounded border border-border bg-bg-3 px-3 py-2 font-mono text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="score">Highest Score</option>
            <option value="price">Lowest Price</option>
          </select>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wider ${
                category === c ? "border-gold bg-gold-muted text-gold" : "border-border text-text-2"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {!loading && filtered.length === 0 && !configError && (
          <p className="text-text-2">
            No published agents yet.{" "}
            <Link href="/verify" className="text-gold hover:underline">
              Verify and publish your first agent
            </Link>
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onSelect={() => setSelected(agent)} />
          ))}
        </div>
      </div>

      <AgentModal
        agent={selected}
        onClose={() => setSelected(null)}
        onSubscribe={() => setSubscribeOpen(true)}
      />
      <SubscribeModal agent={selected} open={subscribeOpen} onClose={() => setSubscribeOpen(false)} />
    </main>
  );
}
