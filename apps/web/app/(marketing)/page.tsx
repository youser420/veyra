import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { CHECK_NAMES as checks } from "@/lib/constants/checkWeights";

export default function LandingPage() {
  return (
    <main className="min-h-screen grid-noise">
      <Navbar />
      <section className="mx-auto grid min-h-[80vh] max-w-6xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-2">
        <div className="space-y-6">
          <p className="font-mono text-sm text-teal">Trust Infrastructure for AI Agents</p>
          <h1 className="font-display text-5xl leading-tight">Every AI agent, <span className="text-gold italic">verified</span> and <span className="text-teal italic">trusted.</span></h1>
          <p className="max-w-xl text-text-2">Veyra verifies AI agents with {checks.length} trust checks, issues credibility certificates, and powers a marketplace of only verified agents.</p>
          <div className="flex gap-3">
            <Link href="/verify" className="rounded-md bg-gold px-4 py-2 text-black">Verify Your Agent</Link>
            <Link href="/marketplace" className="rounded-md border border-border px-4 py-2">Browse Marketplace</Link>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="h-72 w-72 rounded-full border border-border shadow-[0_0_80px_rgba(201,168,76,0.2)]" />
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl grid-cols-3 border-y border-border font-mono text-sm">
        <div className="border-r border-border p-6">2,847 agents verified</div><div className="border-r border-border p-6">1.2M trust checks run</div><div className="p-6">18,400 active users</div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-6 font-display text-4xl">8 Layers of Trust</h2>
        <div className="grid gap-4 md:grid-cols-2">{checks.map((c) => <div key={c} className="card-industrial border-l-2 border-l-gold p-4">{c}</div>)}</div>
      </section>
    </main>
  );
}
