"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Agent } from "@/types";

export function PublishModal({
  agent,
  open,
  onClose,
  onPublished,
}: {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [priceUsd, setPriceUsd] = useState("");
  const [priceInr, setPriceInr] = useState("");
  const [tags, setTags] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!agent) return null;

  async function handlePublish() {
    if (!confirmed) return toast.error("Please confirm your agent is ready for public use");
    const usdCents = Math.round(parseFloat(priceUsd || "0") * 100);
    const inrPaise = Math.round(parseFloat(priceInr || "0") * 100);
    if (usdCents <= 0 && inrPaise <= 0) return toast.error("Set at least one monthly price");

    setLoading(true);
    const res = await fetch(`/api/agents/${agent!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "published",
        priceMonthlyUsd: usdCents,
        priceMonthlyInr: inrPaise,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      return toast.error(data.error || "Failed to publish");
    }

    toast.success("Agent published to marketplace");
    onPublished();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-border bg-bg-2 text-text">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Publish {agent.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block font-mono text-xs text-text-2">Monthly price (USD)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              className="font-mono bg-bg-3"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              placeholder="9.99"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-xs text-text-2">Monthly price (INR)</label>
            <Input
              type="number"
              min="0"
              step="1"
              className="font-mono bg-bg-3"
              value={priceInr}
              onChange={(e) => setPriceInr(e.target.value)}
              placeholder="799"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-xs text-text-2">Tags (comma-separated)</label>
            <Input
              className="font-mono bg-bg-3"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="legal, compliance, rag"
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-text-2">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1"
            />
            I confirm this agent is ready for public use
          </label>
          <Button
            onClick={handlePublish}
            disabled={loading}
            className="w-full bg-teal text-black hover:bg-teal/90"
          >
            Publish to Marketplace
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
