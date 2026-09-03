export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-8 font-display text-5xl">Pricing</h1>
      <div className="grid gap-6 md:grid-cols-3">
        {["Starter", "Builder", "Studio"].map((plan, i) => (
          <div key={plan} className={`card-industrial p-6 ${i === 1 ? "border-gold" : ""}`}>
            <h2 className="font-display text-3xl">{plan}</h2>
            <p className="mt-4 font-mono text-sm">{plan === "Starter" ? "Free" : plan === "Builder" ? "$49/mo" : "$199/mo"}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
