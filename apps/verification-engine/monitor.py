"""Finalize monitor runs and raise trust incidents."""

from __future__ import annotations

import datetime
import os
from typing import Any

import httpx

from checks.scoring import VERIFY_PASS_THRESHOLD
from incidents import create_incident

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
MONITOR_INTERVAL_DAYS = int(os.getenv("MONITOR_INTERVAL_DAYS", "7"))


def _headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_KEY or "",
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


async def _get_agent(agent_id: str) -> dict[str, Any] | None:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/agents",
            params={"id": f"eq.{agent_id}", "select": "*"},
            headers=_headers(),
        )
        if r.status_code >= 400:
            return None
        rows = r.json()
        return rows[0] if rows else None


async def finalize_monitor_run(run_id: str, agent_id: str, final_score: int) -> None:
    now = datetime.datetime.utcnow()
    agent = await _get_agent(agent_id)
    if not agent:
        return

    previous_score = agent.get("score")
    creator_id = agent["creator_id"]
    was_published = agent.get("status") == "published"

    async with httpx.AsyncClient() as client:
        await client.patch(
            f"{SUPABASE_URL}/rest/v1/verification_runs",
            params={"id": f"eq.{run_id}"},
            headers=_headers(),
            json={
                "status": "completed",
                "final_score": final_score,
                "completed_at": now.isoformat(),
            },
        )

    next_monitor = now + datetime.timedelta(days=MONITOR_INTERVAL_DAYS)
    monitor_patch: dict[str, Any] = {
        "score": final_score,
        "last_monitored_at": now.isoformat(),
        "next_monitor_at": next_monitor.isoformat(),
        "updated_at": now.isoformat(),
    }

    incident: dict[str, Any] | None = None

    if final_score < VERIFY_PASS_THRESHOLD:
        monitor_patch["status"] = "failed"
        monitor_patch["published_at"] = None
        incident = {
            "agent_id": agent_id,
            "creator_id": creator_id,
            "run_id": run_id,
            "incident_type": "verify_failed",
            "severity": "critical",
            "title": f"Monitor failed: {agent.get('name', 'Agent')}",
            "description": f"Scheduled monitor scored {final_score} (threshold {VERIFY_PASS_THRESHOLD}). Agent unpublished.",
            "previous_score": previous_score,
            "current_score": final_score,
            "auto_action": "unpublished" if was_published else None,
        }
    elif (
        previous_score is not None
        and final_score < previous_score - 10
    ):
        incident = {
            "agent_id": agent_id,
            "creator_id": creator_id,
            "run_id": run_id,
            "incident_type": "score_drop",
            "severity": "medium",
            "title": f"Trust score dropped: {agent.get('name', 'Agent')}",
            "description": f"Score fell from {previous_score} to {final_score} during scheduled monitor.",
            "previous_score": previous_score,
            "current_score": final_score,
            "auto_action": None,
        }
        if was_published:
            expires = now + datetime.timedelta(days=90)
            monitor_patch["certificate_expires_at"] = expires.isoformat()
    else:
        if was_published:
            expires = now + datetime.timedelta(days=90)
            monitor_patch["certificate_expires_at"] = expires.isoformat()

    async with httpx.AsyncClient() as client:
        await client.patch(
            f"{SUPABASE_URL}/rest/v1/agents",
            params={"id": f"eq.{agent_id}"},
            headers=_headers(),
            json=monitor_patch,
        )

    if incident:
        await create_incident(incident)
