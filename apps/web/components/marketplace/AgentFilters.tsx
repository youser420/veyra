"use client";

export function AgentFilters({ search, setSearch }: { search: string; setSearch: (v: string) => void }) {
  return <input className="w-full rounded border border-border bg-bg-3 p-2" placeholder="Search agents" value={search} onChange={(e)=>setSearch(e.target.value)} />;
}
