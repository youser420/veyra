"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { Progress } from "@/components/ui/progress";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  calls_used: number;
  calls_limit: number;
  is_active: boolean;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [revealed, setRevealed] = useState<string | null>(null);

  function loadKeys() {
    fetch("/api/api-keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys ?? []));
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function generateKey() {
    const res = await fetch("/api/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Failed to generate key");
    setRevealed(data.fullKey);
    toast.success("Copy your key now — it won't be shown again");
    loadKeys();
    setTimeout(() => setRevealed(null), 10000);
  }

  return (
    <main className="flex min-h-screen bg-bg">
      <DashboardSidebar />
      <section className="flex-1 p-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-5xl">API Keys</h1>
          <button onClick={generateKey} className="rounded bg-gold px-4 py-2 text-black">
            Generate New Key
          </button>
        </div>

        {revealed && (
          <div className="mb-6 rounded border border-gold bg-gold-muted p-4">
            <p className="mb-2 font-mono text-xs text-gold">Copy now (visible 10s)</p>
            <code className="break-all font-mono text-sm">{revealed}</code>
          </div>
        )}

        <div className="space-y-4">
          {keys.map((k) => (
            <div key={k.id} className="card-industrial p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{k.name}</p>
                  <p className="font-mono text-sm text-text-2">{k.prefix}••••••••</p>
                </div>
                <span className={`font-mono text-xs ${k.is_active ? "text-teal" : "text-text-3"}`}>
                  {k.is_active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between font-mono text-xs text-text-2">
                  <span>Usage</span>
                  <span>
                    {k.calls_used} / {k.calls_limit}
                  </span>
                </div>
                <Progress value={(k.calls_used / k.calls_limit) * 100} className="h-1" />
              </div>
            </div>
          ))}
          {keys.length === 0 && <p className="text-text-2">No API keys yet.</p>}
        </div>
      </section>
    </main>
  );
}
