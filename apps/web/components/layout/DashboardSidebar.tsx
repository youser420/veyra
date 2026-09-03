"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { INCIDENTS_UPDATED_EVENT } from "@/lib/incidents";

const links = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Agents", href: "/dashboard/agents" },
  { label: "Trust Incidents", href: "/dashboard/incidents", notify: true },
  { label: "Earnings", href: "/dashboard/earnings" },
  { label: "API Keys", href: "/dashboard/api-keys" },
  { label: "Verify New Agent", href: "/verify" },
  { label: "Marketplace", href: "/marketplace" },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();
  const [activeIncidents, setActiveIncidents] = useState(0);

  const loadCount = useCallback(() => {
    fetch("/api/incidents/count")
      .then((r) => r.json())
      .then((d) => setActiveIncidents(d.count ?? 0))
      .catch(() => setActiveIncidents(0));
  }, []);

  useEffect(() => {
    loadCount();
    const onUpdate = () => loadCount();
    window.addEventListener(INCIDENTS_UPDATED_EVENT, onUpdate);
    const interval = window.setInterval(loadCount, 60_000);
    return () => {
      window.removeEventListener(INCIDENTS_UPDATED_EVENT, onUpdate);
      window.clearInterval(interval);
    };
  }, [loadCount]);

  return (
    <aside className="w-[220px] border-r border-border bg-bg-2 p-4">
      <div className="mb-5 font-mono text-gold">Creator Console</div>
      <div className="space-y-2 text-sm text-text-2">
        {links.map(({ label, href, notify }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const hasAlert = notify && activeIncidents > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-bg-3 hover:text-text ${
                active ? "bg-bg-3 text-text" : ""
              } ${hasAlert ? "ring-1 ring-red-400/50" : ""}`}
            >
              <span className={hasAlert ? "font-medium text-text" : ""}>{label}</span>
              {hasAlert && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 font-mono text-[10px] font-bold text-white">
                  {activeIncidents > 9 ? "9+" : activeIncidents}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
