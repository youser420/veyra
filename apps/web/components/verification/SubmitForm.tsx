"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { AGENT_FRAMEWORKS, type AgentFrameworkId } from "@/lib/constants/frameworks";
import type { AgentPrefill } from "@/types";

// Each category has its own competence tasks in apps/verification-engine/checks/domains.py
const CATEGORIES = [
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

export function SubmitForm({
  onSubmit,
  initial,
  reverify,
}: {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  initial?: AgentPrefill | null;
  reverify?: boolean;
}) {
  const [agentName, setAgentName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "General");
  const [method, setMethod] = useState<"url" | "file" | "oauth">(
    (initial?.submission_method as "url" | "file" | "oauth") || "url"
  );
  const [framework, setFramework] = useState<AgentFrameworkId>(
    (initial?.framework as AgentFrameworkId) || "generic_http"
  );
  const [endpointUrl, setEndpointUrl] = useState(initial?.endpoint_url ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [configFilePath, setConfigFilePath] = useState(initial?.config_file_path ?? "");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const frameworkMeta = AGENT_FRAMEWORKS.find((f) => f.id === framework);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setUploading(true);
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return toast.error("Sign in to upload config files");
    }

    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("agent-configs").upload(path, file);
    setUploading(false);

    if (error) return toast.error(error.message);
    setConfigFilePath(path);
    toast.success("Config uploaded");
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "application/json": [".json"],
      "application/x-yaml": [".yaml", ".yml"],
      "text/plain": [".toml"],
    },
    maxFiles: 1,
  });

  async function handleSubmit() {
    if (!agentName.trim()) return toast.error("Agent name is required");
    if ((method === "url" || method === "oauth") && !endpointUrl.trim()) {
      return toast.error("Endpoint URL is required for this submission method");
    }
    if (method === "file" && !configFilePath) return toast.error("Upload a config file");

    setLoading(true);
    try {
      await onSubmit({
        ...(initial?.id ? { agentId: initial.id } : {}),
        agentName,
        category,
        method,
        framework,
        endpointUrl: method === "file" ? null : endpointUrl,
        configFilePath: method === "file" ? configFilePath : null,
        description,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        className="w-full rounded border border-border bg-bg-3 p-2 font-mono focus:border-gold focus:outline-none"
        placeholder="Agent Name"
        value={agentName}
        onChange={(e) => setAgentName(e.target.value)}
      />
      <select
        className="w-full rounded border border-border bg-bg-3 p-2 focus:border-gold focus:outline-none"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>

      <div>
        <label className="mb-1 block font-mono text-xs text-text-2">Agent framework</label>
        <select
          className="w-full rounded border border-border bg-bg-3 p-2 font-mono text-sm focus:border-gold focus:outline-none"
          value={framework}
          onChange={(e) => setFramework(e.target.value as AgentFrameworkId)}
        >
          {AGENT_FRAMEWORKS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        {frameworkMeta && (
          <p className="mt-1 font-mono text-xs text-text-3">{frameworkMeta.hint}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["url", "file", "oauth"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`rounded px-3 py-1 font-mono text-sm ${method === m ? "bg-gold text-black" : "border border-border"}`}
            onClick={() => setMethod(m)}
          >
            {m === "url" ? "API Endpoint" : m === "file" ? "Upload Config" : "Connect"}
          </button>
        ))}
      </div>

      {(method === "url" || method === "oauth") && (
        <input
          className="w-full rounded border border-border bg-bg-3 p-2 font-mono focus:border-gold focus:outline-none"
          placeholder={
            framework === "langchain"
              ? "https://your-agent.example.com (LangServe base URL)"
              : "https://api.your-agent.com/run"
          }
          value={endpointUrl}
          onChange={(e) => setEndpointUrl(e.target.value)}
        />
      )}

      {method === "file" && (
        <div {...getRootProps()} className="cursor-pointer rounded border border-dashed border-border p-8 text-center">
          <input {...getInputProps()} />
          <p className="text-text-2">
            {uploading ? "Uploading…" : configFilePath || "Drop .json, .yaml, or .toml"}
          </p>
          <p className="mt-2 font-mono text-xs text-text-3">
            Config-only verify uses framework rules in Phase 1; endpoint optional.
          </p>
        </div>
      )}

      {method === "oauth" && (
        <p className="rounded border border-border bg-bg-3 p-3 text-sm text-text-2">
          OAuth connect is planned for Phase 2b. Paste your deployed agent URL above for now.
        </p>
      )}

      <textarea
        className="w-full rounded border border-border bg-bg-3 p-2 focus:border-gold focus:outline-none"
        placeholder="Description (optional)"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <button
        type="button"
        disabled={loading || uploading}
        onClick={handleSubmit}
        className="rounded bg-gold px-4 py-2 text-black disabled:opacity-60"
      >
        {loading ? "Starting…" : reverify ? "Run Re-verification" : "Run Verification"}
      </button>
    </div>
  );
}
